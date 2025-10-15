
      mermaid.initialize({ startOnLoad: false, theme: "default" });

      let projects = [];
      let currentProjectIndex = null;
      let currentPlanData = null;
      let currentDate = new Date();

      document
        .getElementById("toggleSidebar")
        .addEventListener("click", toggleSidebar);
      document
        .getElementById("newProjectBtn")
        .addEventListener("click", createNewProject);
      document
        .getElementById("generateBtn")
        .addEventListener("click", generatePlan);
      document
        .getElementById("modifyBtn")
        .addEventListener("click", modifyPlan);
      document
        .getElementById("exportPdfBtn")
        .addEventListener("click", exportPdf);
      document
        .getElementById("exportJsonBtn")
        .addEventListener("click", exportJson);
      document
        .getElementById("exportCsvBtn")
        .addEventListener("click", exportCsv);
      document
        .getElementById("prevMonthBtn")
        .addEventListener("click", prevMonth);
      document
        .getElementById("nextMonthBtn")
        .addEventListener("click", nextMonth);

      document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          document
            .querySelectorAll(".tab")
            .forEach((t) => t.classList.remove("active"));
          document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.remove("active"));
          tab.classList.add("active");
          const tabId = tab.dataset.tab + "Tab";
          document.getElementById(tabId).classList.add("active");

          if (currentPlanData) {
            setTimeout(() => {
              renderMermaidDiagrams(currentPlanData);
            }, 100);
          }
        });
      });

      function toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        const mainContent = document.getElementById("mainContent");
        const toggleBtn = document.getElementById("toggleSidebar");

        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("expanded");
        toggleBtn.classList.toggle("collapsed");
      }

      function createNewProject() {
        currentProjectIndex = null;
        currentPlanData = null;
        document.getElementById("inputSection").style.display = "block";
        document.getElementById("resultsSection").classList.remove("show");
        clearForm();
        document
          .querySelectorAll(".project-item")
          .forEach((item) => item.classList.remove("active"));
      }

      function clearForm() {
        document.getElementById("goalInput").value = "";
        document.getElementById("durationInput").value = "";
        document.getElementById("startDateInput").value = "";
        document.getElementById("endDateInput").value = "";
        document.getElementById("teamSizeInput").value = "";
        document.getElementById("projectTypeInput").value = "";
        document.getElementById("methodologyInput").value = "";
        document.getElementById("modificationInput").value = "";
      }

      function renderProjectsList() {
        const container = document.getElementById("projectsList");
        container.innerHTML = "";

        if (projects.length === 0) {
          container.innerHTML =
            '<p style="color: var(--text-light); font-size: 0.9em; padding: 10px;">No projects yet. Click "New" to start.</p>';
          return;
        }

        projects.forEach((project, index) => {
          const item = document.createElement("div");
          item.className = "project-item";
          if (currentProjectIndex === index) item.classList.add("active");
          item.innerHTML = `
                    <div class="project-item-title">${project.title}</div>
                    <div class="project-item-date">${new Date(
                      project.date
                    ).toLocaleDateString()}</div>
                `;
          item.addEventListener("click", () => loadProject(index));
          container.appendChild(item);
        });
      }

      function loadProject(index) {
        currentProjectIndex = index;
        const project = projects[index];
        currentPlanData = project.data;

        document.getElementById("inputSection").style.display = "none";
        document.getElementById("resultsSection").classList.add("show");

        renderResults(project.data);
        renderProjectsList();
        renderCalendar();
      }

      async function generatePlan() {
        const goal = document.getElementById("goalInput").value.trim();
        const apiKey = document.getElementById("apiKeyInput").value.trim();
        const modelUrl = document.getElementById("modelUrlInput").value.trim();

        if (!goal) {
          showAlert("Please enter your project goal", "error");
          return;
        }

        if (!apiKey) {
          showAlert("Please enter your Gemini API key", "error");
          return;
        }

        if (!modelUrl) {
          showAlert("Please enter the Gemini model URL", "error");
          return;
        }

        const additionalData = {
          duration: document.getElementById("durationInput").value,
          startDate: document.getElementById("startDateInput").value,
          endDate: document.getElementById("endDateInput").value,
          teamSize: document.getElementById("teamSizeInput").value,
          projectType: document.getElementById("projectTypeInput").value,
          methodology: document.getElementById("methodologyInput").value,
        };

        showLoading();

        try {
          const projectPlan = await callGeminiAPI(goal, additionalData, apiKey, modelUrl);

          currentPlanData = {
            ...projectPlan,
            goal,
            additionalData,
            originalPrompt: goal,
          };

          const project = {
            id: Date.now(),
            title: goal.substring(0, 50) + (goal.length > 50 ? "..." : ""),
            date: new Date().toISOString(),
            data: currentPlanData,
          };

          if (currentProjectIndex !== null) {
            projects[currentProjectIndex] = project;
          } else {
            projects.unshift(project);
            currentProjectIndex = 0;
          }

          saveToLocalStorage();
          renderProjectsList();

          document.getElementById("inputSection").style.display = "none";
          document.getElementById("resultsSection").classList.add("show");

          renderResults(currentPlanData);
          renderCalendar();
          showAlert("Project plan generated successfully!", "success");
        } catch (error) {
          console.error("Error:", error);
          showAlert("Failed to generate plan: " + error.message, "error");
        } finally {
          hideLoading();
        }
      }

      async function modifyPlan() {
        const modifications = document
          .getElementById("modificationInput")
          .value.trim();
        const apiKey = document.getElementById("apiKeyInput").value.trim();
        const modelUrl = document.getElementById("modelUrlInput").value.trim();

        if (!modifications || !currentPlanData) {
          showAlert("Please enter modifications", "error");
          return;
        }

        if (!apiKey) {
          showAlert("Please enter your Gemini API key", "error");
          return;
        }

        if (!modelUrl) {
          showAlert("Please enter the Gemini model URL", "error");
          return;
        }

        showLoading();

        try {
          const modifiedPlan = await callGeminiAPI(
            currentPlanData.goal,
            currentPlanData.additionalData,
            apiKey,
            modelUrl,
            modifications,
            currentPlanData
          );

          currentPlanData = {
            ...modifiedPlan,
            goal: currentPlanData.goal,
            additionalData: currentPlanData.additionalData,
            modifications: [
              ...(currentPlanData.modifications || []),
              modifications,
            ],
          };

          projects[currentProjectIndex].data = currentPlanData;
          saveToLocalStorage();
          renderProjectsList();

          renderResults(currentPlanData);
          renderCalendar();
          document.getElementById("modificationInput").value = "";
          showAlert("Plan updated successfully!", "success");
        } catch (error) {
          console.error("Error:", error);
          showAlert("Failed to update plan: " + error.message, "error");
        } finally {
          hideLoading();
        }
      }

      async function callGeminiAPI(
        goal,
        additionalData,
        apiKey,
        modelUrl,
        modifications = null,
        currentPlan = null
      ) {
        const prompt = buildPrompt(
          goal,
          additionalData,
          modifications,
          currentPlan
        );

        console.log("Sending prompt to Gemini:", prompt);

        const apiUrl = `${modelUrl}?key=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "API request failed");
        }

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;

        console.log("Raw response from Gemini:", responseText);

        try {
          let cleanedText = responseText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

          try {
            return JSON.parse(cleanedText);
          } catch (directError) {
            console.log("Direct parse failed, trying to extract JSON...");
            
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            } else {
              return JSON.parse(cleanedText);
            }
          }
        } catch (parseError) {
          console.error("Parse error:", parseError);
          console.log("Cleaned response text:", responseText);
          
          const fallbackPlan = createFallbackPlan(goal, additionalData);
          console.log("Using fallback plan:", fallbackPlan);
          return fallbackPlan;
        }
      }

      function createFallbackPlan(goal, additionalData) {
        return {
          projectSummary: `This is a project plan for: ${goal}. The project will run for ${additionalData.duration} with a team of ${additionalData.teamSize} people using ${additionalData.methodology} methodology.`,
          totalDuration: additionalData.duration,
          phases: [
            {
              name: "Planning Phase",
              duration: "1 week",
              description: "Initial planning and requirement gathering"
            },
            {
              name: "Development Phase",
              duration: "2 weeks",
              description: "Core development work"
            },
            {
              name: "Testing Phase",
              duration: "1 week",
              description: "Quality assurance and testing"
            }
          ],
          tasks: [
            {
              id: 1,
              title: "Define project requirements",
              description: "Gather and document all project requirements",
              phase: "Planning Phase",
              duration: "3 days",
              startDay: "Day 1",
              endDay: "Day 3",
              dependencies: [],
              priority: "high",
              assignedTo: "Project Manager",
              resources: ["Stakeholders", "Documentation tools"],
              deliverables: ["Requirements document"],
              status: "pending"
            },
            {
              id: 2,
              title: "Develop core features",
              description: "Implement the main functionality",
              phase: "Development Phase",
              duration: "8 days",
              startDay: "Day 4",
              endDay: "Day 11",
              dependencies: [1],
              priority: "high",
              assignedTo: "Development Team",
              resources: ["Development tools", "APIs"],
              deliverables: ["Core features implementation"],
              status: "pending"
            },
            {
              id: 3,
              title: "Testing and quality assurance",
              description: "Test all features and fix issues",
              phase: "Testing Phase",
              duration: "5 days",
              startDay: "Day 12",
              endDay: "Day 16",
              dependencies: [2],
              priority: "medium",
              assignedTo: "QA Team",
              resources: ["Testing tools", "Test cases"],
              deliverables: ["Test reports", "Bug fixes"],
              status: "pending"
            }
          ],
          milestones: [
            {
              name: "Requirements Complete",
              description: "All project requirements finalized and approved",
              targetDate: "Week 1",
              criteria: ["Signed requirements document"]
            },
            {
              name: "Development Complete",
              description: "All core features implemented",
              targetDate: "Week 3",
              criteria: ["Feature complete application"]
            }
          ],
          mermaidGantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Requirements Gathering :2025-01-01, 3d
    section Development
    Core Development :2025-01-04, 8d
    section Testing
    QA Testing :2025-01-12, 5d`,
          mermaidWBS: `graph TD
    A[Project] --> B[Planning Phase]
    A --> C[Development Phase]
    A --> D[Testing Phase]
    B --> B1[Requirements Gathering]
    C --> C1[Core Development]
    D --> D1[QA Testing]`,
          mermaidFlowchart: `flowchart TD
    A[Start Project] --> B[Gather Requirements]
    B --> C[Develop Features]
    C --> D[Test Application]
    D --> E[Project Complete]`
        };
      }

      function buildPrompt(
        goal,
        additionalData,
        modifications = null,
        currentPlan = null
      ) {
        let prompt = `You are an expert project manager. Create a comprehensive project plan in VALID JSON format for the following project:

PROJECT DETAILS:
- Goal: ${goal}
- Duration: ${additionalData.duration}
- Start Date: ${additionalData.startDate}
- End Date: ${additionalData.endDate}
- Team Size: ${additionalData.teamSize}
- Project Type: ${additionalData.projectType}
- Methodology: ${additionalData.methodology}

`;

        if (modifications && currentPlan) {
          prompt += `MODIFICATIONS REQUESTED: ${modifications}

Please update the existing plan with these modifications while maintaining the same structure.`;
        }

        prompt += `

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON, no additional text, explanations, or markdown formatting
2. Do not use code blocks (no \`\`\`json or \`\`\`)
3. Ensure the JSON is properly formatted and can be parsed directly
4. Include all required fields with appropriate data

REQUIRED JSON STRUCTURE:
{
  "projectSummary": "string",
  "totalDuration": "string",
  "phases": [
    {
      "name": "string",
      "duration": "string", 
      "description": "string"
    }
  ],
  "tasks": [
    {
      "id": number,
      "title": "string",
      "description": "string",
      "phase": "string",
      "duration": "string",
      "startDay": "string",
      "endDay": "string",
      "dependencies": [number],
      "priority": "high|medium|low",
      "assignedTo": "string",
      "resources": [string],
      "deliverables": [string],
      "status": "pending"
    }
  ],
  "milestones": [
    {
      "name": "string",
      "description": "string",
      "targetDate": "string",
      "criteria": [string]
    }
  ],
  "mermaidGantt": "string",
  "mermaidWBS": "string",
  "mermaidFlowchart": "string"
}

RESPONSE MUST BE VALID JSON ONLY:`;

        return prompt;
      }

      function renderResults(data) {
        console.log("Rendering results:", data);

        const completedTasks = data.tasks.filter(
          (t) => t.status === "completed"
        ).length;
        const statsHtml = `
                <div class="stat-card">
                    <div class="stat-value">${data.tasks.length}</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.totalDuration || "N/A"}</div>
                    <div class="stat-label">Duration</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.phases.length}</div>
                    <div class="stat-label">Phases</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${completedTasks}</div>
                    <div class="stat-label">Completed</div>
                </div>
            `;
        document.getElementById("statsGrid").innerHTML = statsHtml;

        const summaryHtml = `
                <div style="background: var(--bg-light); padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <h3 style="margin-bottom: 15px; color: var(--text-dark);">Project Summary</h3>
                    <p style="line-height: 1.8; color: var(--text-dark);">${data.projectSummary}</p>
                </div>
            `;
        document.getElementById("summaryContent").innerHTML = summaryHtml;

        renderTasks(data.tasks);

        renderCharts(data);

        renderMermaidDiagrams(data);
      }

      function renderTasks(tasks) {
        const container = document.getElementById("taskList");
        container.innerHTML = "";

        tasks.forEach((task) => {
          const taskCard = document.createElement("div");
          taskCard.className = `task-card ${
            task.status === "completed" ? "completed" : ""
          }`;
          taskCard.innerHTML = `
                    <div class="task-header">
                        <div class="task-title">
                            <input type="checkbox" ${
                              task.status === "completed" ? "checked" : ""
                            } 
                                   onchange="window.toggleTaskStatus(${
                                     task.id
                                   })" style="margin-right: 10px;">
                            ${task.id}. ${task.title}
                        </div>
                        <div class="task-actions">
                            <button class="task-action-btn" onclick="window.addExtraTime(${
                              task.id
                            })">
                                <i class="fas fa-clock"></i> Add Time
                            </button>
                            <span class="priority-badge priority-${
                              task.priority
                            }">${task.priority.toUpperCase()}</span>
                        </div>
                    </div>
                    <p style="color: var(--text-light); margin: 10px 0;">${
                      task.description
                    }</p>
                    <div class="task-meta">
                        <div class="task-meta-item">
                            <i class="fas fa-calendar"></i> ${
                              task.startDay
                            } - ${task.endDay}
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-clock"></i> ${task.duration}
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-user"></i> ${task.assignedTo}
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-layer-group"></i> ${task.phase}
                        </div>
                    </div>
                    ${
                      task.dependencies && task.dependencies.length > 0
                        ? `
                        <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 6px; font-size: 0.9em;">
                            <i class="fas fa-link"></i> Depends on: Task ${task.dependencies.join(
                              ", Task "
                            )}
                        </div>
                    `
                        : ""
                    }
                    ${
                      task.deliverables && task.deliverables.length > 0
                        ? `
                        <div style="margin-top: 10px; padding: 10px; background: #d1fae5; border-radius: 6px; font-size: 0.9em;">
                            <i class="fas fa-check-circle"></i> Deliverables: ${task.deliverables.join(
                              ", "
                            )}
                        </div>
                    `
                        : ""
                    }
                `;
          container.appendChild(taskCard);
        });
      }

      window.toggleTaskStatus = function (taskId) {
        const task = currentPlanData.tasks.find((t) => t.id === taskId);
        if (task) {
          task.status = task.status === "completed" ? "pending" : "completed";
          projects[currentProjectIndex].data = currentPlanData;
          saveToLocalStorage();
          renderResults(currentPlanData);
          renderCalendar();
        }
      };

      window.addExtraTime = function (taskId) {
        const extraTime = prompt("Add extra time (e.g., 2 days, 1 week):");
        if (extraTime) {
          const task = currentPlanData.tasks.find((t) => t.id === taskId);
          if (task) {
            task.duration += " + " + extraTime;
            projects[currentProjectIndex].data = currentPlanData;
            saveToLocalStorage();
            renderResults(currentPlanData);
            showAlert("Extra time added to task", "success");
          }
        }
      };

      function renderMermaidDiagrams(data) {
        if (data.mermaidGantt) {
          try {
            const ganttContainer = document.getElementById("ganttChart");
            ganttContainer.innerHTML = data.mermaidGantt;
            ganttContainer.removeAttribute("data-processed");
            mermaid.run({ nodes: [ganttContainer] });
          } catch (error) {
            console.error("Error rendering Gantt chart:", error);
            document.getElementById("ganttChart").innerHTML =
              "<p>Error rendering Gantt chart</p>";
          }
        }

        if (data.mermaidWBS) {
          try {
            const wbsContainer = document.getElementById("wbsChart");
            wbsContainer.innerHTML = data.mermaidWBS;
            wbsContainer.removeAttribute("data-processed");
            mermaid.run({ nodes: [wbsContainer] });
          } catch (error) {
            console.error("Error rendering WBS:", error);
            document.getElementById("wbsChart").innerHTML =
              "<p>Error rendering WBS diagram</p>";
          }
        }

        if (data.mermaidFlowchart) {
          try {
            const flowContainer = document.getElementById("flowChart");
            flowContainer.innerHTML = data.mermaidFlowchart;
            flowContainer.removeAttribute("data-processed");
            mermaid.run({ nodes: [flowContainer] });
          } catch (error) {
            console.error("Error rendering Flowchart:", error);
            document.getElementById("flowChart").innerHTML =
              "<p>Error rendering Flowchart</p>";
          }
        }
      }

      function renderCharts(data) {
        const priorityCanvas = document.getElementById("priorityChart");
        const timelineCanvas = document.getElementById("timelineChart");

        if (priorityCanvas.chart) {
          priorityCanvas.chart.destroy();
        }
        if (timelineCanvas.chart) {
          timelineCanvas.chart.destroy();
        }

        const priorityCounts = {
          high: data.tasks.filter((t) => t.priority === "high").length,
          medium: data.tasks.filter((t) => t.priority === "medium").length,
          low: data.tasks.filter((t) => t.priority === "low").length,
        };

        priorityCanvas.chart = new Chart(priorityCanvas, {
          type: "pie",
          data: {
            labels: ["High Priority", "Medium Priority", "Low Priority"],
            datasets: [
              {
                data: [
                  priorityCounts.high,
                  priorityCounts.medium,
                  priorityCounts.low,
                ],
                backgroundColor: ["#ef4444", "#f59e0b", "#10b981"],
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: { display: true, text: "Task Priority Distribution" },
              legend: { position: "bottom" },
            },
          },
        });

        const phaseCounts = {};
        data.tasks.forEach((task) => {
          phaseCounts[task.phase] = (phaseCounts[task.phase] || 0) + 1;
        });

        timelineCanvas.chart = new Chart(timelineCanvas, {
          type: "bar",
          data: {
            labels: Object.keys(phaseCounts),
            datasets: [
              {
                label: "Tasks per Phase",
                data: Object.values(phaseCounts),
                backgroundColor: "#2563eb",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: { display: true, text: "Tasks Distribution by Phase" },
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
              },
            },
          },
        });
      }

      function renderCalendar() {
        const container = document.getElementById("calendarContainer");
        const currentMonthEl = document.getElementById("currentMonth");

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        currentMonthEl.textContent = currentDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        let calendarHTML = '<div class="calendar-grid">';

        dayNames.forEach((day) => {
          calendarHTML += `<div class="calendar-day-header">${day}</div>`;
        });

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = 0; i < startingDay; i++) {
          const day = prevMonthLastDay - startingDay + i + 1;
          calendarHTML += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
        }

        const tasksByDate = {};

        if (currentPlanData && currentPlanData.tasks) {
          const startDate = new Date(2025, 9, 20); 
          const endDate = new Date(2025, 11, 20); 

          currentPlanData.tasks.forEach((task, index) => {
            const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
            const taskDay = Math.floor(
              (index / currentPlanData.tasks.length) * daysDiff
            );
            const taskDate = new Date(startDate);
            taskDate.setDate(startDate.getDate() + taskDay);

            const day = taskDate.getDate();
            const month = taskDate.getMonth();

            if (
              month === currentDate.getMonth() &&
              year === currentDate.getFullYear()
            ) {
              if (!tasksByDate[day]) {
                tasksByDate[day] = [];
              }
              tasksByDate[day].push(task);
            }
          });
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = `${year}-${month + 1}-${day}`;
          calendarHTML += `<div class="calendar-day"><div class="calendar-day-number">${day}</div>`;

          if (tasksByDate[day]) {
            tasksByDate[day].forEach((task) => {
              calendarHTML += `<div class="calendar-task ${
                task.priority
              }" title="${task.title}">${task.id}. ${task.title.substring(
                0,
                15
              )}...</div>`;
            });
          }

          calendarHTML += "</div>";
        }

        const totalCells = 42; 
        const remainingCells = totalCells - (startingDay + daysInMonth);
        for (let i = 1; i <= remainingCells; i++) {
          calendarHTML += `<div class="calendar-day other-month"><div class="calendar-day-number">${i}</div></div>`;
        }

        calendarHTML += "</div>";
        container.innerHTML = calendarHTML;
      }

      function prevMonth() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
      }

      function nextMonth() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
      }

      function exportPdf() {
        const element = document.getElementById("resultsSection");
        const opt = {
          margin: 10,
          filename: `project-plan-${Date.now()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };
        html2pdf().set(opt).from(element).save();
        showAlert("Exporting to PDF...", "success");
      }

      function exportJson() {
        const dataStr = JSON.stringify(currentPlanData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        downloadFile(blob, `project-plan-${Date.now()}.json`);
        showAlert("Exported as JSON", "success");
      }

      function exportCsv() {
        let csv =
          "ID,Title,Description,Phase,Duration,Start,End,Priority,Status,Assigned To\n";
        currentPlanData.tasks.forEach((task) => {
          const desc = task.description.replace(/"/g, '""');
          csv += `${task.id},"${task.title}","${desc}","${task.phase}","${task.duration}","${task.startDay}","${task.endDay}",${task.priority},${task.status},"${task.assignedTo}"\n`;
        });
        const blob = new Blob([csv], { type: "text/csv" });
        downloadFile(blob, `project-tasks-${Date.now()}.csv`);
        showAlert("Exported as CSV", "success");
      }

      function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      function saveToLocalStorage() {
        try {
          const data = {
            projects,
            lastUpdated: new Date().toISOString(),
            apiKey: document.getElementById("apiKeyInput").value,
            modelUrl: document.getElementById("modelUrlInput").value
          };
          localStorage.setItem("taskPlannerData", JSON.stringify(data));
        } catch (error) {
          console.error("Error saving to localStorage:", error);
        }
      }

      function loadFromLocalStorage() {
        try {
          const saved = localStorage.getItem("taskPlannerData");
          if (saved) {
            const data = JSON.parse(saved);
            projects = data.projects || [];
            if (data.apiKey) {
              document.getElementById("apiKeyInput").value = data.apiKey;
            }
            if (data.modelUrl) {
              document.getElementById("modelUrlInput").value = data.modelUrl;
            }
            renderProjectsList();
            renderCalendar();
          }
        } catch (error) {
          console.error("Error loading from localStorage:", error);
        }
      }

      function showLoading() {
        document.getElementById("loadingOverlay").classList.add("show");
      }

      function hideLoading() {
        document.getElementById("loadingOverlay").classList.remove("show");
      }

      function showAlert(message, type) {
        const container = document.getElementById("alertContainer");
        const alert = document.createElement("div");
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
                <i class="fas fa-${
                  type === "error" ? "exclamation-circle" : "check-circle"
                }"></i>
                ${message}
            `;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
      }

      window.addEventListener("DOMContentLoaded", () => {
        loadFromLocalStorage();
        renderCalendar();

        document.getElementById("goalInput").value =
          "build a mobile app for a food delivery service";
        document.getElementById("durationInput").value = "2 months";
        document.getElementById("startDateInput").value = "2025-10-20";
        document.getElementById("endDateInput").value = "2025-12-20";
        document.getElementById("teamSizeInput").value = "40";
        document.getElementById("projectTypeInput").value = "software";
        document.getElementById("methodologyInput").value = "waterfall";
      });
