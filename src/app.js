(function () {
      "use strict";

      var STORAGE_KEY = "jackson.ai.workbench.v1.1";
      var knownModules = ["overview", "fitness", "finance", "todo"];
      var moduleMeta = {
        overview: { label: "今日总览", icon: "✦", subtitle: "把身体、资产和今天放进一个屏幕" },
        fitness: { label: "健身运动", icon: "💪", subtitle: "今天练什么，比计划本身更重要" },
        finance: { label: "财经资讯", icon: "📈", subtitle: "中文财经新闻 · 每约 30 分钟更新" },
        todo: { label: "今日待办", icon: "✅", subtitle: "只保留真正需要推进的事情" }
      };
      var themeOrder = ["system", "light", "dark"];
      var financeFilter = "全部";
      var taskFilter = "today";
      var taskFormOpen = false;
      var longPressTimer = null;
      var longPressTriggered = false;
      var restTimer = null;
      var restRemaining = 0;
      var trainingPartOrder = ["chest", "shoulders", "back", "arms", "legs", "core", "cardio"];
      var trainingPartMeta = {
        chest: { label: "胸", icon: "🏋️", color: "#ed6b5f" },
        shoulders: { label: "肩", icon: "△", color: "#ee9b43" },
        back: { label: "背", icon: "🪽", color: "#5b87d8" },
        arms: { label: "胳膊", icon: "💪", color: "#9b6bd6" },
        legs: { label: "腿", icon: "🦵", color: "#35a674" },
        core: { label: "核心", icon: "◎", color: "#d56b91" },
        cardio: { label: "有氧", icon: "♥", color: "#e05252" },
        rest: { label: "休息", icon: "☁", color: "#7c8c86" },
        legacy: { label: "旧版计划", icon: "↺", color: "#7c8c86" }
      };
      var weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
      var trainingEditor = { scope: "template", part: "chest", index: -1 };
      var financeFeed = { loaded: false, generatedAt: null, items: [], source: "本地演示" };

      function exerciseTemplate(id, part, name, equipment, sets, reps, rest, art, kind, note) {
        return { id: id, part: part, kind: kind || "strength", name: name, equipment: equipment, sets: sets, reps: reps, rest: rest, weight: null, note: note || "", art: art };
      }

      function createDefaultTemplates() {
        return {
          chest: [
            exerciseTemplate("chest-bench", "chest", "平板杠铃卧推", "平板卧推凳 + 杠铃", 4, "6–8", 120, "press"),
            exerciseTemplate("chest-incline", "chest", "上斜哑铃卧推", "上斜训练凳 + 哑铃", 3, "8–10", 90, "press"),
            exerciseTemplate("chest-machine", "chest", "器械推胸", "坐姿推胸机", 3, "10–12", 75, "press"),
            exerciseTemplate("chest-cable", "chest", "绳索夹胸", "龙门架绳索", 3, "12–15", 60, "press")
          ],
          shoulders: [
            exerciseTemplate("shoulder-press", "shoulders", "坐姿哑铃推举", "靠背训练凳 + 哑铃", 4, "6–8", 120, "press"),
            exerciseTemplate("shoulder-raise", "shoulders", "哑铃侧平举", "哑铃", 3, "12–15", 60, "press"),
            exerciseTemplate("shoulder-reverse", "shoulders", "反向蝴蝶机", "反向蝴蝶机", 3, "12–15", 60, "pull"),
            exerciseTemplate("shoulder-facepull", "shoulders", "绳索面拉", "龙门架 + 绳索把手", 3, "12–15", 60, "pull")
          ],
          back: [
            exerciseTemplate("back-pulldown", "back", "高位下拉", "高位下拉机", 4, "8–10", 90, "pull"),
            exerciseTemplate("back-row", "back", "杠铃划船", "杠铃", 3, "6–8", 120, "pull"),
            exerciseTemplate("back-cable-row", "back", "坐姿绳索划船", "坐姿划船机", 3, "10–12", 75, "pull"),
            exerciseTemplate("back-straight-arm", "back", "直臂下压", "龙门架 + 直杆", 3, "12–15", 60, "pull")
          ],
          arms: [
            exerciseTemplate("arms-curl", "arms", "杠铃弯举", "直杆或曲杆杠铃", 3, "8–10", 75, "press"),
            exerciseTemplate("arms-incline-curl", "arms", "上斜哑铃弯举", "上斜训练凳 + 哑铃", 3, "10–12", 60, "press"),
            exerciseTemplate("arms-pushdown", "arms", "绳索下压", "龙门架 + 绳索把手", 3, "10–12", 60, "press"),
            exerciseTemplate("arms-overhead", "arms", "过顶绳索臂屈伸", "龙门架 + 绳索把手", 3, "10–12", 60, "press")
          ],
          legs: [
            exerciseTemplate("legs-squat", "legs", "杠铃深蹲", "深蹲架 + 杠铃", 4, "6–8", 120, "squat"),
            exerciseTemplate("legs-rdl", "legs", "罗马尼亚硬拉", "杠铃", 3, "8–10", 120, "hinge"),
            exerciseTemplate("legs-press", "legs", "腿举机", "腿举机", 3, "10–12", 90, "squat"),
            exerciseTemplate("legs-curl", "legs", "坐姿腿弯举", "腿弯举机", 3, "10–12", 75, "squat"),
            exerciseTemplate("legs-calf", "legs", "提踵", "站姿或坐姿提踵机", 3, "12–15", 60, "squat")
          ],
          core: [
            exerciseTemplate("core-plank", "core", "平板支撑", "瑜伽垫", 3, "45–60 秒", 45, "core"),
            exerciseTemplate("core-deadbug", "core", "死虫", "瑜伽垫", 3, "每侧 10", 45, "core"),
            exerciseTemplate("core-cable", "core", "绳索卷腹", "龙门架 + 绳索把手", 3, "12–15", 60, "core"),
            exerciseTemplate("core-legraise", "core", "悬垂举腿", "单杠", 3, "8–12", 60, "core")
          ],
          cardio: [
            exerciseTemplate("cardio-warmup", "cardio", "跑步机热身", "跑步机", 1, "5 分钟", 0, "walk", "duration"),
            exerciseTemplate("cardio-zone2", "cardio", "坡度快走 Zone 2", "跑步机", 1, "25 分钟", 0, "walk", "duration", "保持可以短句交流的强度"),
            exerciseTemplate("cardio-cooldown", "cardio", "慢走冷身", "跑步机", 1, "5 分钟", 0, "walk", "duration")
          ]
        };
      }

      function dateKey(date) {
        var d = date || new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      }

      function plusDays(base, amount) {
        var d = new Date(base || new Date());
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() + amount);
        return dateKey(d);
      }

      function createDefaultState() {
        var today = dateKey();
        return {
          version: "1.2",
          active: "overview",
          theme: "system",
          sortMode: false,
          navOrder: ["overview", "fitness", "finance", "todo"],
          profile: null,
          workout: {
            planDate: null,
            planName: "",
            isRecovery: false,
            currentPart: null,
            currentPlan: [],
            completedDates: [],
            weekSchedule: null,
            dailyOverrides: {},
            templates: createDefaultTemplates(),
            lastWeights: {}
          },
          tasks: [
            { id: "task-welcome-1", title: "完成 Jackson 工作台首次设置", category: "生活", priority: "high", due: today, done: false, createdAt: Date.now() },
            { id: "task-welcome-2", title: "确认本周训练安排", category: "健身", priority: "medium", due: today, done: false, createdAt: Date.now() + 1 },
            { id: "task-welcome-3", title: "浏览今日财经观察清单", category: "财经", priority: "low", due: today, done: false, createdAt: Date.now() + 2 }
          ]
        };
      }

      function loadState() {
        var base = createDefaultState();
        try {
          var raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return base;
          var saved = JSON.parse(raw);
          var next = Object.assign({}, base, saved);
          next.workout = Object.assign({}, base.workout, saved.workout || {});
          next.workout.completedDates = Array.isArray(next.workout.completedDates) ? next.workout.completedDates : [];
          next.workout.currentPlan = Array.isArray(next.workout.currentPlan) ? next.workout.currentPlan : [];
          next.workout.dailyOverrides = next.workout.dailyOverrides && typeof next.workout.dailyOverrides === "object" ? next.workout.dailyOverrides : {};
          next.workout.lastWeights = next.workout.lastWeights && typeof next.workout.lastWeights === "object" ? next.workout.lastWeights : {};
          var legacyWeightKeys = { bench: "chest-bench", incline: "chest-incline", row: "back-cable-row", pulldown: "back-pulldown", squat: "legs-squat", hinge: "legs-rdl", shoulder: "shoulder-press", raise: "shoulder-raise", core: "core-plank", walk: "cardio-zone2" };
          next.workout.currentPlan.forEach(function (exercise) {
            var weightKey = exercise.templateId || legacyWeightKeys[exercise.code];
            var savedWeight = Number(exercise.weight);
            if (weightKey && exercise.weight != null && Number.isFinite(savedWeight) && next.workout.lastWeights[weightKey] == null) next.workout.lastWeights[weightKey] = savedWeight;
          });
          var defaults = createDefaultTemplates();
          var savedTemplates = next.workout.templates && typeof next.workout.templates === "object" ? next.workout.templates : {};
          next.workout.templates = {};
          trainingPartOrder.forEach(function (part) {
            next.workout.templates[part] = Array.isArray(savedTemplates[part]) ? savedTemplates[part] : defaults[part];
          });
          var allowedParts = trainingPartOrder.concat(["rest"]);
          if (!Array.isArray(next.workout.weekSchedule) || next.workout.weekSchedule.length !== 7 || next.workout.weekSchedule.some(function (part) { return allowedParts.indexOf(part) < 0; })) {
            next.workout.weekSchedule = null;
          }
          if (!next.workout.currentPart && next.workout.planDate === dateKey() && next.workout.currentPlan.length) next.workout.currentPart = "legacy";
          next.version = "1.2";
          next.tasks = Array.isArray(saved.tasks) ? saved.tasks : base.tasks;
          next.navOrder = Array.isArray(saved.navOrder) ? saved.navOrder.filter(function (id) { return knownModules.indexOf(id) >= 0; }) : base.navOrder;
          knownModules.forEach(function (id) { if (next.navOrder.indexOf(id) < 0) next.navOrder.push(id); });
          if (knownModules.indexOf(next.active) < 0) next.active = "overview";
          return next;
        } catch (error) {
          return base;
        }
      }

      var state = loadState();

      function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }

      saveState();

      function escapeHtml(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function uid(prefix) {
        return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
      }

      function showToast(message) {
        var el = document.getElementById("toast");
        el.textContent = message;
        el.hidden = false;
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(function () { el.hidden = true; }, 2400);
      }

      function applyTheme() {
        var resolved = state.theme;
        if (resolved === "system") resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", resolved);
        document.querySelector('meta[name="theme-color"]').setAttribute("content", resolved === "dark" ? "#0b281b" : "#214b37");
        var labels = { system: "跟随系统", light: "浅色", dark: "深色" };
        var icons = { system: "◐", light: "☀", dark: "☾" };
        var button = document.getElementById("themeButton");
        button.textContent = icons[state.theme];
        button.title = "主题：" + labels[state.theme];
        button.setAttribute("aria-label", button.title);
      }

      function cycleTheme() {
        var index = themeOrder.indexOf(state.theme);
        state.theme = themeOrder[(index + 1) % themeOrder.length];
        saveState();
        applyTheme();
        showToast("已切换为" + ({ system: "跟随系统", light: "浅色主题", dark: "深色主题" })[state.theme]);
      }

      function renderNav() {
        var html = state.navOrder.map(function (id, index) {
          var meta = moduleMeta[id];
          var controls = state.sortMode
            ? "<span class=\"sort-controls\"><button type=\"button\" aria-label=\"上移\" onclick=\"moveNav(event,'" + id + "',-1)\">↑</button><button type=\"button\" aria-label=\"下移\" onclick=\"moveNav(event,'" + id + "',1)\">↓</button></span>"
            : "";
          return "<div class=\"nav-row\"><button class=\"nav-button " + (state.active === id ? "active" : "") + "\" type=\"button\" onpointerdown=\"startLongPress(event,'" + id + "')\" onpointerup=\"endLongPress()\" onpointercancel=\"endLongPress()\" onpointerleave=\"endLongPress()\" onclick=\"navClick(event,'" + id + "')\"><span class=\"nav-icon\">" + meta.icon + "</span><span class=\"nav-label\">" + meta.label + "</span>" + controls + "</button></div>";
        }).join("");
        if (state.sortMode) html += "<div class=\"sort-hint\">排序模式已开启<br><button class=\"text-link\" style=\"color:white\" type=\"button\" onclick=\"finishSort()\">完成</button></div>";
        document.getElementById("navList").innerHTML = html;
      }

      window.startLongPress = function () {
        longPressTriggered = false;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(function () {
          longPressTriggered = true;
          state.sortMode = true;
          saveState();
          renderNav();
          if (navigator.vibrate) navigator.vibrate(35);
          showToast("排序模式已开启");
        }, 500);
      };

      window.endLongPress = function () {
        clearTimeout(longPressTimer);
      };

      window.navClick = function (event, id) {
        if (longPressTriggered) {
          longPressTriggered = false;
          event.preventDefault();
          return;
        }
        if (state.sortMode) return;
        setActive(id);
      };

      window.moveNav = function (event, id, direction) {
        event.stopPropagation();
        var index = state.navOrder.indexOf(id);
        var next = index + direction;
        if (next < 0 || next >= state.navOrder.length) return;
        var copy = state.navOrder.slice();
        var temp = copy[index];
        copy[index] = copy[next];
        copy[next] = temp;
        state.navOrder = copy;
        saveState();
        renderNav();
      };

      window.finishSort = function () {
        state.sortMode = false;
        saveState();
        renderNav();
      };

      function setActive(id) {
        state.active = id;
        state.sortMode = false;
        saveState();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (id === "fitness") {
          if (!state.profile) setTimeout(openSetup, 180);
          else if (!state.workout.weekSchedule && !(state.workout.planDate === dateKey() && state.workout.currentPlan.length)) setTimeout(openSchedule, 180);
        }
      }
      window.setActive = setActive;

      function formatLongDate() {
        return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
      }

      function greeting() {
        var hour = new Date().getHours();
        if (hour < 6) return "夜深了";
        if (hour < 11) return "早上好";
        if (hour < 14) return "中午好";
        if (hour < 18) return "下午好";
        return "晚上好";
      }

      function hero(kicker, title, copy) {
        return "<section class=\"hero\"><p class=\"hero-kicker\">" + escapeHtml(kicker) + "</p><h2>" + escapeHtml(title) + "</h2><p>" + escapeHtml(copy) + "</p></section>";
      }

      function pendingTasks() {
        return state.tasks.filter(function (task) { return !task.done; });
      }

      function todayTasks() {
        var today = dateKey();
        return state.tasks.filter(function (task) { return task.due === today; });
      }

      function completedThisWeek() {
        var now = new Date();
        var day = now.getDay() || 7;
        var start = new Date(now);
        start.setDate(now.getDate() - day + 1);
        start.setHours(0,0,0,0);
        return state.workout.completedDates.filter(function (key) { return new Date(key + "T12:00:00") >= start; }).length;
      }

      function calculateStreak() {
        var dates = new Set(state.workout.completedDates);
        var cursor = new Date();
        cursor.setHours(12,0,0,0);
        if (!dates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
        var streak = 0;
        while (dates.has(dateKey(cursor))) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
        return streak;
      }

      function renderOverview() {
        var tasks = todayTasks();
        var doneCount = tasks.filter(function (task) { return task.done; }).length;
        var taskRate = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;
        var trainingGoal = state.profile ? (scheduleTrainingGoal() || Number(state.profile.days) || 0) : 0;
        var weekDone = completedThisWeek();
        var trainingRate = trainingGoal ? Math.min(100, Math.round(weekDone / trainingGoal * 100)) : 0;
        var dailyNews = getDailyNews();
        var priority = pendingTasks().slice().sort(sortTasks).slice(0, 5);
        var profileAction = state.profile ? "查看今日计划" : "建立训练档案";
        var profileClick = state.profile ? "setActive('fitness')" : "openSetup()";

        var priorityHtml = priority.length ? priority.map(function (task, index) {
          return "<div class=\"action-item\"><span class=\"action-index " + (index < 3 ? "rank-" + (index + 1) : "") + "\">" + (index + 1) + "</span><div class=\"item-copy\"><p class=\"item-title\">" + escapeHtml(task.title) + "</p><div class=\"item-meta\">" + escapeHtml(task.category) + " · " + priorityLabel(task.priority) + "优先级</div></div><button class=\"text-link\" type=\"button\" onclick=\"toggleTask('" + task.id + "')\">完成</button></div>";
        }).join("") : "<div class=\"empty-state\"><b>今天已经清空</b>去做点让自己开心的事吧。</div>";

        var newsHtml = dailyNews.slice(0, 5).map(function (item, index) {
          var body = "<span class=\"action-index rank-" + (index + 1) + "\">" + (index + 1) + "</span><div class=\"item-copy\"><p class=\"item-title\">" + escapeHtml(item.title) + "</p><div class=\"item-meta\">" + item.category + " · " + newsDisplayTime(item) + "</div></div>";
          return item.url ? "<a class=\"action-item action-link\" href=\"" + escapeHtml(item.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + body + "</a>" : "<div class=\"action-item\">" + body + "</div>";
        }).join("");

        return hero(formatLongDate(), greeting() + "，Jackson", "今天不用面面俱到：照顾身体、看清重要信息，然后完成最关键的几件事。") +
          "<section class=\"kpi-grid\">" +
            "<article class=\"kpi-card\"><div class=\"kpi-top\"><span class=\"kpi-icon\">💪</span><small>本周健身</small></div><div class=\"kpi-value\">" + weekDone + " / " + (trainingGoal || "—") + " 次</div><button class=\"text-link\" type=\"button\" onclick=\"" + profileClick + "\">" + profileAction + " →</button><div class=\"progress\"><span style=\"width:" + trainingRate + "%\"></span></div></article>" +
            "<article class=\"kpi-card\"><div class=\"kpi-top\"><span class=\"kpi-icon\">📈</span><small>财经观察</small></div><div class=\"kpi-value\">" + dailyNews.length + " 条</div><button class=\"text-link\" type=\"button\" onclick=\"setActive('finance')\">查看最新新闻 →</button><div class=\"progress\"><span style=\"width:100%\"></span></div></article>" +
            "<article class=\"kpi-card\"><div class=\"kpi-top\"><span class=\"kpi-icon\">✅</span><small>今日待办</small></div><div class=\"kpi-value\">" + doneCount + " / " + tasks.length + " 项</div><button class=\"text-link\" type=\"button\" onclick=\"setActive('todo')\">管理任务 →</button><div class=\"progress\"><span style=\"width:" + taskRate + "%\"></span></div></article>" +
          "</section>" +
          "<section class=\"section two-column\"><div><div class=\"section-heading\"><div><h3>今日行动</h3><p>按优先级聚合三个模块</p></div><button class=\"text-link\" type=\"button\" onclick=\"setActive('todo')\">全部待办</button></div><div class=\"action-list\">" + priorityHtml + "</div></div>" +
          "<div><div class=\"section-heading\"><div><h3>财经速读</h3><p>真实来源 · 点击阅读原文</p></div><button class=\"text-link\" type=\"button\" onclick=\"setActive('finance')\">查看全部</button></div><div class=\"action-list\">" + newsHtml + "</div></div></section>";
      }

      function exerciseSvg(type) {
        var common = "fill=\"none\" stroke=\"currentColor\" stroke-width=\"5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"";
        if (type === "squat") return "<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\"><g " + common + "><circle cx=\"51\" cy=\"20\" r=\"8\"/><path d=\"M49 29l-9 26 19 12M40 55l-17 14M59 67l20 10M33 40h39M24 34v12M80 34v12\"/></g></svg>";
        if (type === "pull") return "<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\"><g " + common + "><circle cx=\"50\" cy=\"28\" r=\"8\"/><path d=\"M22 13h56M29 13v12M71 13v12M34 20l13 18M66 20L53 38M50 38v26M50 64L35 85M50 64l15 21\"/></g></svg>";
        if (type === "core") return "<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\"><g " + common + "><circle cx=\"76\" cy=\"42\" r=\"7\"/><path d=\"M69 48L47 55 27 53M47 55l17 12M27 53L15 71M64 67h20M13 75h74\"/></g></svg>";
        if (type === "walk" || type === "stretch") return "<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\"><g " + common + "><circle cx=\"51\" cy=\"18\" r=\"8\"/><path d=\"M50 27v31M50 36L27 48M50 36l20-15M50 58L34 84M50 58l22 26\"/></g></svg>";
        if (type === "hinge") return "<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\"><g " + common + "><circle cx=\"68\" cy=\"27\" r=\"8\"/><path d=\"M61 32L42 48l21 15M42 48L25 70M63 63L53 87M63 63l17 22M17 72h66M20 65v14M80 65v14\"/></g></svg>";
        return "<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\"><g " + common + "><circle cx=\"50\" cy=\"24\" r=\"8\"/><path d=\"M50 32v31M50 40L30 25M50 40l20-15M50 63L36 86M50 63l14 23M19 22h20M16 17v10M42 17v10M61 22h20M58 17v10M84 17v10\"/></g></svg>";
      }

      window.toggleSet = function (id, index) {
        var plan = state.workout.currentPlan;
        var exerciseIndex = plan.findIndex(function (item) { return item.id === id; });
        if (exerciseIndex < 0) return;
        var exercise = plan[exerciseIndex];
        if (index === exercise.completedSets) {
          exercise.completedSets += 1;
          if (exercise.rest > 0 && exercise.completedSets < exercise.sets) startTimer(exercise.rest, exercise.name + " · 下一组");
          if (exercise.completedSets === exercise.sets && exerciseIndex < plan.length - 1) {
            setTimeout(function () {
              var next = document.getElementById("exercise-" + plan[exerciseIndex + 1].id);
              if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 250);
          }
        } else if (index === exercise.completedSets - 1) {
          exercise.completedSets -= 1;
        } else {
          showToast("请按顺序完成组数");
          return;
        }
        saveState();
        var allDone = plan.every(function (item) { return item.completedSets === item.sets; });
        render();
        if (allDone) finishWorkout();
      };

      function startTimer(seconds, label) {
        clearInterval(restTimer);
        restRemaining = seconds;
        document.getElementById("timerCopy").textContent = label;
        updateTimerUi();
        document.getElementById("timerBar").hidden = false;
        restTimer = setInterval(function () {
          restRemaining -= 1;
          updateTimerUi();
          if (restRemaining <= 0) {
            skipTimer();
            showToast("休息结束，开始下一组");
            if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
          }
        }, 1000);
      }

      function updateTimerUi() {
        var minutes = Math.floor(restRemaining / 60);
        var seconds = restRemaining % 60;
        document.getElementById("timerValue").textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
      }

      window.skipTimer = function () {
        clearInterval(restTimer);
        restTimer = null;
        document.getElementById("timerBar").hidden = true;
      };

      function finishWorkout() {
        var today = dateKey();
        if (state.workout.completedDates.indexOf(today) < 0) state.workout.completedDates.push(today);
        saveState();
        skipTimer();
        document.getElementById("celebrationCopy").textContent = "今日计划已记录，连续打卡 " + calculateStreak() + " 天。";
        document.getElementById("celebrationBackdrop").hidden = false;
      }

      window.closeCelebration = function () {
        document.getElementById("celebrationBackdrop").hidden = true;
        setActive("overview");
      };

      window.openSetup = function () {
        var profile = state.profile;
        if (profile) {
          ["height", "weight", "targetWeight", "level", "goal", "equipment"].forEach(function (key) {
            var input = document.getElementById(key);
            if (input && profile[key] != null) input.value = profile[key];
          });
        }
        document.getElementById("setupBackdrop").hidden = false;
      };

      window.closeSetup = function () {
        document.getElementById("setupBackdrop").hidden = true;
      };

      function weekdayIndex(date) {
        var day = (date || new Date()).getDay();
        return day === 0 ? 6 : day - 1;
      }

      function scheduleTrainingGoal() {
        return state.workout.weekSchedule ? state.workout.weekSchedule.filter(function (part) { return part !== "rest"; }).length : 0;
      }

      function currentTrainingPart() {
        var today = dateKey();
        if (state.workout.dailyOverrides[today]) return state.workout.dailyOverrides[today];
        if (!state.workout.weekSchedule) return null;
        return state.workout.weekSchedule[weekdayIndex()];
      }

      function exerciseArtForPart(part) {
        return { chest: "press", shoulders: "press", back: "pull", arms: "press", legs: "squat", core: "core", cardio: "walk" }[part] || "press";
      }

      function cloneForToday(source, part) {
        var templateId = source.templateId || source.id || uid(part + "-template");
        var remembered = state.workout.lastWeights[templateId];
        var weight = remembered != null ? Number(remembered) : source.weight == null || source.weight === "" ? null : Number(source.weight);
        return {
          id: uid("exercise"),
          templateId: templateId,
          part: part,
          kind: source.kind || "strength",
          name: source.name,
          equipment: source.equipment || "自定义器械",
          sets: Math.max(1, Number(source.sets) || 1),
          reps: source.reps || "自定义",
          rest: Math.max(0, Number(source.rest) || 0),
          weight: Number.isFinite(weight) ? weight : null,
          note: source.note || "",
          completedSets: 0,
          art: source.art || exerciseArtForPart(part)
        };
      }

      function buildTodayPlan(part) {
        var today = dateKey();
        state.workout.planDate = today;
        state.workout.currentPart = part;
        state.workout.isRecovery = part === "rest";
        state.workout.planName = part === "rest" ? "休息日" : trainingPartMeta[part].label + "部训练";
        state.workout.currentPlan = part === "rest" ? [] : (state.workout.templates[part] || []).map(function (item) { return cloneForToday(item, part); });
        saveState();
      }

      function ensureTodayPlan(force) {
        if (!state.profile) return;
        var today = dateKey();
        if (!force && state.workout.planDate === today) return;
        var part = currentTrainingPart();
        if (!part) return;
        buildTodayPlan(part);
      }

      function workoutProgress() {
        var plan = state.workout.currentPlan;
        var total = plan.reduce(function (sum, exercise) { return sum + exercise.sets; }, 0);
        var complete = plan.reduce(function (sum, exercise) { return sum + exercise.completedSets; }, 0);
        return { total: total, complete: complete, rate: total ? Math.round(complete / total * 100) : 0 };
      }

      function renderPartPicker() {
        var current = state.workout.currentPart || currentTrainingPart();
        return trainingPartOrder.concat(["rest"]).map(function (part) {
          var meta = trainingPartMeta[part];
          return "<button class=\"part-button " + (current === part ? "active" : "") + "\" type=\"button\" onclick=\"selectTodayPart('" + part + "')\"><span>" + meta.icon + "</span><b>" + meta.label + "</b></button>";
        }).join("");
      }

      function renderWeekSchedule() {
        if (!state.workout.weekSchedule) return "<div class=\"empty-state compact\"><b>还没有配置周计划</b><p>先为周一到周日分别选择部位或休息。</p><button class=\"primary-button\" type=\"button\" onclick=\"openSchedule()\">配置一周训练</button></div>";
        return state.workout.weekSchedule.map(function (part, index) {
          var meta = trainingPartMeta[part];
          return "<button class=\"week-day " + (index === weekdayIndex() ? "today" : "") + "\" type=\"button\" onclick=\"openSchedule()\"><small>" + weekDays[index] + "</small><span>" + meta.icon + "</span><b>" + meta.label + "</b></button>";
        }).join("");
      }

      function renderFitness() {
        if (!state.profile) {
          return hero("FITNESS", "先认识你的身体", "建立轻量档案后，再由你亲自安排每周每天练什么。") +
            "<section class=\"section panel\"><div class=\"empty-state\"><div style=\"font-size:48px;margin-bottom:12px\">🏋️</div><b>还没有训练档案</b><p>大约 1 分钟完成设置，之后仍可随时修改。</p><button class=\"primary-button\" type=\"button\" onclick=\"openSetup()\">开始建档</button></div></section>";
        }
        ensureTodayPlan(false);
        var progress = workoutProgress();
        var streak = calculateStreak();
        var plan = state.workout.currentPlan;
        var profile = state.profile;
        var goalLabels = { muscle: "增肌", fatloss: "减脂", shape: "塑形", fitness: "体能" };
        var equipmentLabels = { gym: "健身房", dumbbell: "居家哑铃", bodyweight: "徒手" };
        var currentPart = state.workout.currentPart || currentTrainingPart();
        var currentMeta = trainingPartMeta[currentPart] || trainingPartMeta.legacy;

        var exercises = plan.map(function (exercise, exerciseIndex) {
          var sets = [];
          for (var index = 0; index < exercise.sets; index += 1) {
            var checked = index < exercise.completedSets;
            var locked = index > exercise.completedSets;
            sets.push("<button class=\"set-button " + (checked ? "checked" : "") + " " + (locked ? "locked" : "") + "\" type=\"button\" onclick=\"toggleSet('" + exercise.id + "'," + index + ")\">" + (checked ? "✓ " : "") + "第 " + (index + 1) + " 组</button>");
          }
          var weight = exercise.weight == null
            ? "<div class=\"weight-control\"><span class=\"chip\">" + (exercise.kind === "duration" ? "计时任务" : "重量待填写") + "</span></div>"
            : "<div class=\"weight-control\"><button type=\"button\" onclick=\"changeWeight('" + exercise.id + "',-2.5)\" aria-label=\"减少重量\">−</button><strong>" + exercise.weight + " kg</strong><button type=\"button\" onclick=\"changeWeight('" + exercise.id + "',2.5)\" aria-label=\"增加重量\">＋</button></div>";
          return "<article id=\"exercise-" + exercise.id + "\" class=\"exercise-card " + (exercise.completedSets === exercise.sets ? "done" : "") + "\"><div class=\"exercise-art\">" + exerciseSvg(exercise.art) + "</div><div><div class=\"exercise-header\"><div><h4 class=\"exercise-title\">" + (exerciseIndex + 1) + ". " + escapeHtml(exercise.name) + "</h4><p class=\"exercise-subtitle\">" + escapeHtml(exercise.equipment) + " · " + exercise.sets + " 组 × " + escapeHtml(exercise.reps) + "</p></div><button class=\"mini-edit\" type=\"button\" onclick=\"openExerciseEditor('today'," + exerciseIndex + ")\" aria-label=\"编辑动作\">✎</button></div>" + weight + (exercise.note ? "<p class=\"exercise-note\">" + escapeHtml(exercise.note) + "</p>" : "") + "<div class=\"set-row\">" + sets.join("") + "</div><div class=\"item-meta\">组间休息 " + exercise.rest + " 秒</div></div></article>";
        }).join("");

        var planBody = currentPart === "rest"
          ? "<div class=\"panel empty-state\"><div style=\"font-size:42px\">☁</div><b>今天安排休息</b><p>恢复也是训练的一部分。散步和轻柔活动可以按身体状态自行选择。</p></div>"
          : exercises || "<div class=\"panel empty-state\"><b>这个部位还没有动作</b><p>从管理模板或编辑今日计划中添加。</p></div>";
        var scheduleNotice = !state.workout.weekSchedule ? "<div class=\"notice warning-notice\">旧版今日计划已保留。请在下一次生成计划前完成一周训练配置。 <button class=\"text-link\" type=\"button\" onclick=\"openSchedule()\">现在配置</button></div>" : "";
        var templatePart = trainingPartOrder.indexOf(currentPart) >= 0 ? currentPart : "chest";
        var editorActions = "<button class=\"soft-button\" type=\"button\" onclick=\"openTrainingEditor('template','" + templatePart + "')\">管理训练模板</button>" +
          (currentPart === "rest" ? "" : "<button class=\"primary-button\" type=\"button\" onclick=\"openTrainingEditor('today')\">编辑今天</button>");

        return hero("FITNESS · " + currentMeta.label, state.workout.planName || "选择今天的训练", currentPart === "rest" ? "休息不是偷懒，而是让下一次训练更有质量。" : "每天专注一个部位。重量由你决定，动作质量永远优先。") +
          "<section class=\"section panel\"><div class=\"section-heading\"><div><h3>今天练什么</h3><p>临时切换只影响今天，可勾选同步到每周计划</p></div><label class=\"checkbox-line inline\"><input id=\"persistTodayPart\" type=\"checkbox\">同步周计划</label></div><div class=\"part-grid\">" + renderPartPicker() + "</div></section>" + scheduleNotice +
          "<section class=\"section panel\"><div class=\"section-heading\"><div><h3>我的一周</h3><p>每天一个部位，也可以安排休息</p></div><button class=\"soft-button\" type=\"button\" onclick=\"openSchedule()\">修改周计划</button></div><div class=\"week-grid\">" + renderWeekSchedule() + "</div></section>" +
          "<section class=\"section two-column\"><div class=\"panel profile-summary\"><div class=\"profile-ring\">" + progress.rate + "%</div><div class=\"item-copy\"><p class=\"item-title\">今日完成 " + progress.complete + " / " + progress.total + " 组</p><div class=\"profile-facts\"><span class=\"chip\">🔥 连续 " + streak + " 天</span><span class=\"chip\">" + goalLabels[profile.goal] + "</span><span class=\"chip\">" + equipmentLabels[profile.equipment] + "</span></div></div></div>" +
          "<div class=\"panel\"><div class=\"kpi-top\"><div><p class=\"item-title\">Jackson 的训练档案</p><div class=\"item-meta\">" + profile.height + " cm · " + profile.weight + " kg → " + profile.targetWeight + " kg</div></div><button class=\"soft-button\" type=\"button\" onclick=\"openSetup()\">修改</button></div><div class=\"progress\"><span style=\"width:" + progress.rate + "%\"></span></div></div></section>" +
          "<div class=\"notice\">默认动作参考 <a href=\"https://www.acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">ACSM 渐进训练指南</a>与 <a href=\"https://www.acefitness.org/resources/everyone/exercise-library/\" target=\"_blank\" rel=\"noopener noreferrer\">ACE 动作库</a>，但不构成医疗或个性化教练建议。重量不会按体重自动计算；第一次填写后会在相同动作中沿用。</div>" +
          "<section class=\"section\"><div class=\"section-heading\"><div><h3>今日动作</h3><p>按顺序勾选；再次点击最后完成的一组可回退</p></div><div class=\"heading-actions\">" + editorActions + "</div></div><div class=\"workout-list\">" + planBody + "</div></section>";
      }

      window.selectTodayPart = function (part) {
        if (!state.workout.weekSchedule) {
          openSchedule();
          showToast("请先完成一周训练配置");
          return;
        }
        var progress = workoutProgress();
        if (progress.complete > 0 && !window.confirm("切换部位会清空今天已勾选的组数，确定继续？")) return;
        state.workout.dailyOverrides[dateKey()] = part;
        if (document.getElementById("persistTodayPart") && document.getElementById("persistTodayPart").checked) state.workout.weekSchedule[weekdayIndex()] = part;
        buildTodayPlan(part);
        render();
        showToast("今天已切换为" + trainingPartMeta[part].label);
      };

      window.changeWeight = function (id, delta) {
        var exercise = state.workout.currentPlan.find(function (item) { return item.id === id; });
        if (!exercise || exercise.kind === "duration") return;
        var base = exercise.weight == null ? 0 : Number(exercise.weight);
        exercise.weight = Math.max(0, Math.round((base + delta) * 10) / 10);
        state.workout.lastWeights[exercise.templateId || exercise.name] = exercise.weight;
        saveState();
        render();
      };

      window.openSchedule = function () {
        var options = "<option value=\"\">请选择</option>" + trainingPartOrder.concat(["rest"]).map(function (part) { return "<option value=\"" + part + "\">" + trainingPartMeta[part].icon + " " + trainingPartMeta[part].label + "</option>"; }).join("");
        document.getElementById("scheduleFields").innerHTML = weekDays.map(function (label, index) {
          var value = state.workout.weekSchedule ? state.workout.weekSchedule[index] : "";
          return "<label class=\"schedule-field\"><span>" + label + "</span><select class=\"select\" name=\"day" + index + "\" required>" + options + "</select></label>".replace("value=\"" + value + "\"", "value=\"" + value + "\" selected");
        }).join("");
        if (state.workout.weekSchedule) {
          state.workout.weekSchedule.forEach(function (part, index) { document.querySelector('[name="day' + index + '"]').value = part; });
        }
        document.getElementById("scheduleBackdrop").hidden = false;
      };

      window.closeSchedule = function () { document.getElementById("scheduleBackdrop").hidden = true; };

      function editorList() {
        return trainingEditor.scope === "today" ? state.workout.currentPlan : state.workout.templates[trainingEditor.part];
      }

      function renderTrainingEditor() {
        var list = editorList();
        var isToday = trainingEditor.scope === "today";
        document.getElementById("trainingEditorTitle").textContent = isToday ? "编辑今日计划" : "管理训练模板";
        document.getElementById("trainingEditorCopy").textContent = isToday ? "修改只影响今天；编辑动作时可以选择同步保存到模板。" : "模板变更会用于下一次生成计划，不会覆盖已完成记录。";
        var tabs = isToday ? "" : "<div class=\"filter-row\">" + trainingPartOrder.map(function (part) { return "<button class=\"filter-button " + (trainingEditor.part === part ? "active" : "") + "\" type=\"button\" onclick=\"switchEditorPart('" + part + "')\">" + trainingPartMeta[part].label + "</button>"; }).join("") + "</div>";
        var rows = list.length ? list.map(function (item, index) {
          var weight = item.weight == null ? "未填重量" : item.weight + " kg";
          return "<div class=\"editor-row\"><div class=\"item-copy\"><p class=\"item-title\">" + escapeHtml(item.name) + "</p><div class=\"item-meta\">" + escapeHtml(item.equipment || "自定义器械") + " · " + item.sets + " 组 × " + escapeHtml(item.reps) + " · " + weight + "</div></div><div class=\"editor-actions\"><button type=\"button\" onclick=\"moveExercise(" + index + ",-1)\" aria-label=\"上移\">↑</button><button type=\"button\" onclick=\"moveExercise(" + index + ",1)\" aria-label=\"下移\">↓</button><button type=\"button\" onclick=\"openExerciseEditor('" + trainingEditor.scope + "'," + index + ")\" aria-label=\"编辑\">✎</button><button type=\"button\" onclick=\"removeExercise(" + index + ")\" aria-label=\"删除\">×</button></div></div>";
        }).join("") : "<div class=\"empty-state compact\"><b>还没有动作</b><p>点击下方按钮添加第一个动作。</p></div>";
        var apply = !isToday && currentTrainingPart() === trainingEditor.part ? "<button class=\"soft-button\" type=\"button\" onclick=\"applyTemplateToToday()\">应用到今天</button>" : "";
        document.getElementById("trainingEditorBody").innerHTML = tabs + "<div class=\"editor-list\">" + rows + "</div><div class=\"form-actions\">" + apply + "<button class=\"primary-button\" type=\"button\" onclick=\"openExerciseEditor('" + trainingEditor.scope + "',-1)\">+ 添加动作</button></div>";
      }

      window.openTrainingEditor = function (scope, part) {
        if (scope === "today" && state.workout.currentPart === "rest") {
          showToast("休息日没有今日动作，可先切换训练部位");
          return;
        }
        trainingEditor.scope = scope || "template";
        trainingEditor.part = part || (trainingPartOrder.indexOf(state.workout.currentPart) >= 0 ? state.workout.currentPart : "chest");
        document.getElementById("trainingEditorBackdrop").hidden = false;
        renderTrainingEditor();
      };
      window.closeTrainingEditor = function () { document.getElementById("trainingEditorBackdrop").hidden = true; render(); };
      window.switchEditorPart = function (part) { trainingEditor.part = part; renderTrainingEditor(); };

      window.moveExercise = function (index, direction) {
        var list = editorList();
        var next = index + direction;
        if (next < 0 || next >= list.length) return;
        var item = list[index]; list[index] = list[next]; list[next] = item;
        saveState(); renderTrainingEditor();
      };

      window.removeExercise = function (index) {
        var list = editorList();
        if (!list[index] || !window.confirm("删除动作“" + list[index].name + "”？")) return;
        list.splice(index, 1); saveState(); renderTrainingEditor();
      };

      window.openExerciseEditor = function (scope, index) {
        trainingEditor.scope = scope || trainingEditor.scope;
        if (trainingEditor.scope === "today") trainingEditor.part = trainingPartOrder.indexOf(state.workout.currentPart) >= 0 ? state.workout.currentPart : "chest";
        trainingEditor.index = Number(index);
        var item = trainingEditor.index >= 0 ? editorList()[trainingEditor.index] : null;
        var form = document.getElementById("exerciseForm");
        form.reset();
        document.getElementById("exerciseTitle").textContent = item ? "编辑动作" : "添加动作";
        document.getElementById("exerciseName").value = item ? item.name : "";
        document.getElementById("exerciseEquipment").value = item ? item.equipment || "" : "";
        document.getElementById("exerciseKind").value = item ? item.kind || "strength" : trainingEditor.part === "cardio" ? "duration" : "strength";
        document.getElementById("exerciseSets").value = item ? item.sets : 3;
        document.getElementById("exerciseReps").value = item ? item.reps : "8–12";
        document.getElementById("exerciseWeight").value = item && item.weight != null ? item.weight : "";
        document.getElementById("exerciseRest").value = item ? item.rest : 75;
        document.getElementById("exerciseNote").value = item ? item.note || "" : "";
        document.getElementById("saveTemplateLabel").hidden = trainingEditor.scope !== "today";
        document.getElementById("saveToTemplate").checked = false;
        document.getElementById("exerciseBackdrop").hidden = false;
      };
      window.closeExerciseEditor = function () { document.getElementById("exerciseBackdrop").hidden = true; };

      window.applyTemplateToToday = function () {
        if (workoutProgress().complete > 0 && !window.confirm("应用模板会清空今天已勾选的组数，确定继续？")) return;
        state.workout.dailyOverrides[dateKey()] = trainingEditor.part;
        buildTodayPlan(trainingEditor.part);
        closeTrainingEditor();
        showToast("模板已应用到今天");
      };

      var financePool = [
        { category: "美股", title: "美股盘前：检查主要指数与科技板块强弱", summary: "观察风险偏好、成交量与领涨板块，不用单一涨跌替代完整判断。", source: "Jackson 财经观察", time: "08:30" },
        { category: "美股", title: "本周观察：大型科技公司的资本开支信号", summary: "关注投入方向、现金流压力以及市场预期是否已经提前计价。", source: "Jackson 财经观察", time: "08:45" },
        { category: "美股", title: "利率变化如何影响成长股估值", summary: "将收益率、盈利预期和估值变化分开观察，减少只看价格的误判。", source: "Jackson 财经观察", time: "09:00" },
        { category: "美股", title: "复盘清单：隔夜市场的上涨由谁推动", summary: "检查指数贡献度、市场宽度以及防御板块是否同步走强。", source: "Jackson 财经观察", time: "09:15" },
        { category: "美股", title: "财报观察：收入增长之外还要看什么", summary: "毛利率、经营现金流和管理层指引通常比单一收入数字更完整。", source: "Jackson 财经观察", time: "09:30" },
        { category: "A股", title: "A 股开盘前：先看量能与核心板块延续性", summary: "把板块热度、成交额和个股扩散度放在同一张观察表里。", source: "Jackson 财经观察", time: "08:35" },
        { category: "A股", title: "市场风格观察：价值与成长是否发生切换", summary: "跟踪代表性指数相对强弱，避免被单日行情牵着走。", source: "Jackson 财经观察", time: "08:50" },
        { category: "A股", title: "行业跟踪：政策信号如何传导到公司业绩", summary: "区分政策方向、订单兑现和利润贡献，建立可复查的证据链。", source: "Jackson 财经观察", time: "09:05" },
        { category: "A股", title: "收盘复盘：指数上涨是否伴随赚钱效应", summary: "结合上涨家数、成交额和板块持续性判断行情质量。", source: "Jackson 财经观察", time: "09:20" },
        { category: "A股", title: "资产配置：单一行业仓位是否过于集中", summary: "记录行业暴露与最大回撤承受范围，比预测短期涨跌更可控。", source: "Jackson 财经观察", time: "09:35" },
        { category: "宏观", title: "宏观日历：今天有哪些数据值得关注", summary: "优先关注可能影响利率、汇率与风险偏好的数据发布时间。", source: "Jackson 财经观察", time: "08:40" },
        { category: "宏观", title: "通胀观察：同比、环比和核心指标不要混看", summary: "拆分基数效应与真实趋势，避免只被一个醒目的数字影响。", source: "Jackson 财经观察", time: "08:55" },
        { category: "宏观", title: "汇率变化对不同资产意味着什么", summary: "从资金成本、企业盈利与跨境资本流动三个角度建立观察框架。", source: "Jackson 财经观察", time: "09:10" },
        { category: "宏观", title: "经济增长与市场上涨并不总是同步", summary: "市场交易的是预期变化，宏观数据则更多反映已经发生的经济活动。", source: "Jackson 财经观察", time: "09:25" },
        { category: "宏观", title: "本周重点：梳理政策、数据与市场预期差", summary: "先写下市场共识，再记录新信息是否真正改变原有假设。", source: "Jackson 财经观察", time: "09:40" }
      ];

      function seededNumber() {
        return Number(dateKey().replace(/-/g, ""));
      }

      function getDailyNews() {
        if (financeFeed.loaded && financeFeed.items.length) return financeFeed.items;
        var seed = seededNumber();
        var selected = [];
        ["美股", "A股", "宏观"].forEach(function (category, index) {
          var pool = financePool.filter(function (item) { return item.category === category; });
          selected.push(pool[(seed + index * 3) % pool.length]);
        });
        var rest = financePool.filter(function (item) { return selected.indexOf(item) < 0; });
        selected.push(rest[(seed * 3) % rest.length]);
        var lastPool = rest.filter(function (item) { return selected.indexOf(item) < 0; });
        selected.push(lastPool[(seed * 7) % lastPool.length]);
        return selected.map(function (item) { return Object.assign({ isDemo: true, url: null, publishedAt: null, domain: item.source }, item); });
      }

      function newsDisplayTime(item) {
        if (!item.publishedAt) return item.time || "演示";
        var date = new Date(item.publishedAt);
        if (Number.isNaN(date.getTime())) return "时间未知";
        return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
      }

      function financeFreshness() {
        if (!financeFeed.loaded || !financeFeed.generatedAt) return { label: "演示内容", tone: "demo", detail: "实时数据暂不可用" };
        var generatedTime = new Date(financeFeed.generatedAt).getTime();
        if (!Number.isFinite(generatedTime)) return { label: "缓存新闻", tone: "stale", detail: "更新时间异常，请检查 GitHub Actions" };
        var ageHours = (Date.now() - generatedTime) / 3600000;
        if (ageHours > 24) return { label: "缓存新闻", tone: "stale", detail: "超过 24 小时未更新，请检查 GitHub Actions" };
        if (ageHours > 2) return { label: "更新延迟", tone: "delay", detail: "最近一次更新可能存在延迟" };
        return { label: "准实时", tone: "live", detail: "每约 30 分钟更新" };
      }

      async function loadFinanceNews() {
        try {
          var response = await fetch("./news.json", { cache: "no-store" });
          if (!response.ok) throw new Error("news unavailable");
          var payload = await response.json();
          if (!payload || !Array.isArray(payload.items)) throw new Error("invalid news");
          var items = payload.items.filter(function (item) {
            return item && typeof item.title === "string" && /^https:\/\//i.test(item.url || "") && ["A股", "美股", "宏观"].indexOf(item.category) >= 0;
          });
          if (!items.length) return;
          financeFeed = { loaded: true, generatedAt: payload.generatedAt, items: items, source: payload.source || "GDELT DOC 2.0" };
          if (state.active === "finance" || state.active === "overview") render();
        } catch (error) {
          financeFeed.loaded = false;
        }
      }

      function renderFinance() {
        var allNews = getDailyNews();
        var news = financeFilter === "全部" ? allNews : allNews.filter(function (item) { return item.category === financeFilter; });
        var freshness = financeFreshness();
        var buttons = ["全部", "美股", "A股", "宏观"].map(function (filter) {
          return "<button class=\"filter-button " + (financeFilter === filter ? "active" : "") + "\" type=\"button\" onclick=\"setFinanceFilter('" + filter + "')\">" + filter + "</button>";
        }).join("");
        var cards = news.map(function (item) {
          var originalIndex = allNews.indexOf(item);
          var summary = item.isDemo ? "<p class=\"news-summary\">" + escapeHtml(item.summary) + "</p>" : "";
          var card = "<span class=\"news-rank " + (originalIndex < 3 ? "rank-" + (originalIndex + 1) : "") + "\">" + (originalIndex + 1) + "</span><div class=\"item-copy\"><div class=\"news-badges\"><span class=\"category-chip\">" + item.category + "</span><span class=\"chip status-" + freshness.tone + "\">" + (item.isDemo ? "演示内容" : freshness.label) + "</span></div><p class=\"item-title\">" + escapeHtml(item.title) + "</p>" + summary + "<div class=\"item-meta\">" + escapeHtml(item.domain || item.source || "来源未知") + " · " + newsDisplayTime(item) + "</div></div><span class=\"chevron\">↗</span>";
          return item.url ? "<a class=\"news-card news-link\" href=\"" + escapeHtml(item.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + card + "</a>" : "<article class=\"news-card\">" + card + "</article>";
        }).join("");
        var updated = financeFeed.generatedAt ? newsDisplayTime({ publishedAt: financeFeed.generatedAt }) : "等待首次抓取";
        var empty = cards || "<div class=\"panel empty-state\"><b>这个分类暂时没有中文新闻</b><p>系统不会用其他分类或虚构内容补足数量。</p></div>";
        return hero("FINANCE · " + freshness.label, "财经资讯", "中文来源优先，展示真实标题、来源、发布时间和原文链接，不构成投资建议。") +
          "<section class=\"section\"><div class=\"banner\"><span class=\"banner-icon\">📰</span><div>每约 30 分钟更新 · 最多 15 条<small>最后更新：" + updated + " · " + freshness.detail + "</small></div></div></section>" +
          (financeFeed.loaded ? "" : "<div class=\"notice warning-notice\">实时数据暂不可用，当前显示明确标注的本地演示内容。恢复后会自动切换为真实新闻。</div>") +
          "<section class=\"section\"><div class=\"section-heading\"><div><h3>最新财经新闻</h3><p>优先覆盖 A股、美股与宏观；点击卡片阅读原文</p></div></div><div class=\"filter-row\">" + buttons + "</div><div class=\"news-list\">" + empty + "</div></section>";
      }

      window.setFinanceFilter = function (filter) {
        financeFilter = filter;
        render();
      };

      function priorityLabel(priority) {
        return { high: "高", medium: "中", low: "低" }[priority] || "中";
      }

      function sortTasks(a, b) {
        var weights = { high: 0, medium: 1, low: 2 };
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (weights[a.priority] !== weights[b.priority]) return weights[a.priority] - weights[b.priority];
        return String(a.due).localeCompare(String(b.due)) || a.createdAt - b.createdAt;
      }

      function dueLabel(due) {
        if (due === dateKey()) return "今天";
        if (due === plusDays(new Date(), 1)) return "明天";
        if (due === "someday") return "以后";
        return due;
      }

      function renderTodo() {
        var all = state.tasks.slice().sort(sortTasks);
        var filtered = all.filter(function (task) {
          if (taskFilter === "today") return task.due === dateKey();
          if (taskFilter === "pending") return !task.done;
          if (taskFilter === "done") return task.done;
          return true;
        });
        var today = todayTasks();
        var done = today.filter(function (task) { return task.done; }).length;
        var rate = today.length ? Math.round(done / today.length * 100) : 0;
        var filterButtons = [
          { id: "today", label: "今天" },
          { id: "pending", label: "未完成" },
          { id: "all", label: "全部" },
          { id: "done", label: "已完成" }
        ].map(function (filter) {
          return "<button class=\"filter-button " + (taskFilter === filter.id ? "active" : "") + "\" type=\"button\" onclick=\"setTaskFilter('" + filter.id + "')\">" + filter.label + "</button>";
        }).join("");
        var form = taskFormOpen ? "<form class=\"todo-form\" onsubmit=\"addTask(event)\"><input class=\"field task-title-field\" name=\"title\" placeholder=\"输入一件具体要做的事\" maxlength=\"80\" autofocus required><select class=\"select\" name=\"category\"><option>工作</option><option>健身</option><option>财经</option><option>生活</option></select><select class=\"select\" name=\"priority\"><option value=\"high\">高优先级</option><option value=\"medium\" selected>中优先级</option><option value=\"low\">低优先级</option></select><select class=\"select\" name=\"due\"><option value=\"today\">今天</option><option value=\"tomorrow\">明天</option><option value=\"someday\">以后</option></select><button class=\"primary-button\" type=\"submit\">添加</button></form>" : "";
        var cards = filtered.length ? filtered.map(function (task) {
          return "<article class=\"task-card " + (task.done ? "done" : "") + "\"><button class=\"check-button\" type=\"button\" onclick=\"toggleTask('" + task.id + "')\" aria-label=\"切换完成状态\">" + (task.done ? "✓" : "") + "</button><div class=\"item-copy\"><p class=\"item-title\">" + escapeHtml(task.title) + "</p><div class=\"profile-facts\"><span class=\"priority-chip priority-" + task.priority + "\">" + priorityLabel(task.priority) + "优先级</span><span class=\"chip\">" + escapeHtml(task.category) + "</span><span class=\"chip\">" + dueLabel(task.due) + "</span></div></div><div class=\"task-actions\"><button type=\"button\" onclick=\"editTask('" + task.id + "')\" aria-label=\"编辑任务\">✎</button><button type=\"button\" onclick=\"deleteTask('" + task.id + "')\" aria-label=\"删除任务\">×</button></div></article>";
        }).join("") : "<div class=\"panel empty-state\"><b>这里暂时没有任务</b>减少任务，也是一种进展。</div>";
        return hero("FOCUS · " + formatLongDate(), "今日待办", "把任务写成可以完成的动作。今天只抓最重要的几件事。") +
          "<section class=\"section panel\"><div class=\"kpi-top\"><div><p class=\"item-title\">今日完成度</p><div class=\"item-meta\">已完成 " + done + " / " + today.length + " 项</div></div><div class=\"kpi-value\" style=\"margin:0\">" + rate + "%</div></div><div class=\"progress\"><span style=\"width:" + rate + "%\"></span></div></section>" +
          "<section class=\"section\"><div class=\"todo-toolbar\"><div class=\"filter-row\" style=\"margin:0\">" + filterButtons + "</div><button class=\"primary-button\" type=\"button\" onclick=\"toggleTaskForm()\">" + (taskFormOpen ? "收起" : "+ 添加任务") + "</button></div>" + form + "<div class=\"task-list\">" + cards + "</div></section>";
      }

      window.setTaskFilter = function (filter) {
        taskFilter = filter;
        render();
      };

      window.toggleTaskForm = function () {
        taskFormOpen = !taskFormOpen;
        render();
        if (taskFormOpen) setTimeout(function () { var input = document.querySelector(".task-title-field"); if (input) input.focus(); }, 20);
      };

      window.addTask = function (event) {
        event.preventDefault();
        var data = new FormData(event.target);
        var dueValue = data.get("due");
        var due = dueValue === "today" ? dateKey() : dueValue === "tomorrow" ? plusDays(new Date(), 1) : "someday";
        state.tasks.push({
          id: uid("task"),
          title: String(data.get("title")).trim(),
          category: String(data.get("category")),
          priority: String(data.get("priority")),
          due: due,
          done: false,
          createdAt: Date.now()
        });
        saveState();
        taskFormOpen = false;
        taskFilter = due === dateKey() ? "today" : "pending";
        render();
        showToast("任务已添加");
      };

      window.toggleTask = function (id) {
        var task = state.tasks.find(function (item) { return item.id === id; });
        if (!task) return;
        task.done = !task.done;
        saveState();
        render();
      };

      window.editTask = function (id) {
        var task = state.tasks.find(function (item) { return item.id === id; });
        if (!task) return;
        var title = window.prompt("修改任务标题", task.title);
        if (title == null || !title.trim()) return;
        task.title = title.trim().slice(0, 80);
        saveState();
        render();
      };

      window.deleteTask = function (id) {
        var task = state.tasks.find(function (item) { return item.id === id; });
        if (!task) return;
        if (!window.confirm("删除任务“" + task.title + "”？")) return;
        state.tasks = state.tasks.filter(function (item) { return item.id !== id; });
        saveState();
        render();
        showToast("任务已删除");
      };

      function render() {
        var meta = moduleMeta[state.active];
        document.getElementById("pageTitle").textContent = meta.label;
        document.getElementById("pageSubtitle").textContent = meta.subtitle;
        renderNav();
        var content = document.getElementById("content");
        if (state.active === "fitness") content.innerHTML = renderFitness();
        else if (state.active === "finance") content.innerHTML = renderFinance();
        else if (state.active === "todo") content.innerHTML = renderTodo();
        else content.innerHTML = renderOverview();
      }

      document.getElementById("profileForm").addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(event.target);
        var previousStart = state.profile && state.profile.startedAt;
        state.profile = {
          height: Number(data.get("height")),
          weight: Number(data.get("weight")),
          targetWeight: Number(data.get("targetWeight")),
          level: String(data.get("level")),
          goal: String(data.get("goal")),
          equipment: String(data.get("equipment")),
          days: state.profile && state.profile.days ? state.profile.days : 0,
          startedAt: previousStart || dateKey()
        };
        saveState();
        closeSetup();
        state.active = "fitness";
        render();
        showToast("训练档案已保存");
        if (!state.workout.weekSchedule) setTimeout(openSchedule, 180);
      });

      document.getElementById("scheduleForm").addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(event.target);
        var schedule = weekDays.map(function (_, index) { return String(data.get("day" + index) || ""); });
        var allowed = trainingPartOrder.concat(["rest"]);
        if (schedule.some(function (part) { return allowed.indexOf(part) < 0; })) {
          showToast("请为七天全部选择训练部位或休息");
          return;
        }
        state.workout.weekSchedule = schedule;
        if (!(state.workout.planDate === dateKey() && state.workout.currentPlan.length)) buildTodayPlan(currentTrainingPart());
        saveState();
        closeSchedule();
        render();
        showToast("一周训练已保存");
      });

      document.getElementById("exerciseForm").addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(event.target);
        var list = editorList();
        var existing = trainingEditor.index >= 0 ? list[trainingEditor.index] : null;
        var templateId = existing ? existing.templateId || existing.id : uid(trainingEditor.part + "-custom");
        var weightText = String(data.get("weight") || "").trim();
        var item = {
          id: existing ? existing.id : trainingEditor.scope === "today" ? uid("exercise") : templateId,
          templateId: trainingEditor.scope === "today" ? templateId : undefined,
          part: trainingEditor.part,
          kind: String(data.get("kind")),
          name: String(data.get("name")).trim().slice(0, 40),
          equipment: String(data.get("equipment")).trim().slice(0, 40),
          sets: Math.max(1, Math.min(12, Number(data.get("sets")) || 1)),
          reps: String(data.get("reps")).trim().slice(0, 20),
          weight: weightText === "" ? null : Math.max(0, Number(weightText)),
          rest: Math.max(0, Math.min(600, Number(data.get("rest")) || 0)),
          note: String(data.get("note") || "").trim().slice(0, 80),
          art: existing && existing.art ? existing.art : exerciseArtForPart(trainingEditor.part)
        };
        if (trainingEditor.scope === "today") item.completedSets = existing ? Math.min(existing.completedSets || 0, item.sets) : 0;
        if (trainingEditor.index >= 0) list[trainingEditor.index] = item;
        else list.push(item);

        if (item.weight != null) state.workout.lastWeights[templateId] = item.weight;
        if (trainingEditor.scope === "today" && data.get("saveToTemplate")) {
          var templates = state.workout.templates[trainingEditor.part];
          var templateItem = Object.assign({}, item, { id: templateId });
          delete templateItem.templateId;
          delete templateItem.completedSets;
          var templateIndex = templates.findIndex(function (entry) { return entry.id === templateId; });
          if (templateIndex >= 0) templates[templateIndex] = templateItem;
          else templates.push(templateItem);
        }
        saveState();
        closeExerciseEditor();
        if (!document.getElementById("trainingEditorBackdrop").hidden) renderTrainingEditor();
        render();
        showToast("动作已保存");
      });

      window.openDataModal = function () { document.getElementById("dataBackdrop").hidden = false; };
      window.closeDataModal = function () { document.getElementById("dataBackdrop").hidden = true; };

      window.exportData = function () {
        var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = "jackson-workbench-backup-" + dateKey() + ".json";
        link.click();
        URL.revokeObjectURL(url);
        showToast("备份已导出");
      };

      document.getElementById("importFile").addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var incoming = JSON.parse(reader.result);
            if (!incoming || !Array.isArray(incoming.tasks) || !incoming.workout) throw new Error("invalid");
            localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
            state = loadState();
            applyTheme();
            closeDataModal();
            render();
            showToast("备份已导入");
          } catch (error) {
            showToast("无法导入：文件格式不正确");
          }
          event.target.value = "";
        };
        reader.readAsText(file);
      });

      window.resetData = function () {
        if (!window.confirm("确认清除全部本地数据？建议先导出备份。")) return;
        localStorage.removeItem(STORAGE_KEY);
        state = createDefaultState();
        saveState();
        closeDataModal();
        applyTheme();
        render();
        showToast("已恢复初始状态");
      };

      document.getElementById("themeButton").addEventListener("click", cycleTheme);
      document.getElementById("dataButton").addEventListener("click", openDataModal);
      document.getElementById("footerDate").textContent = dateKey().replace(/-/g, "/");
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (state.theme === "system") applyTheme(); });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeSetup();
          closeDataModal();
          closeSchedule();
          closeTrainingEditor();
          closeExerciseEditor();
          document.getElementById("celebrationBackdrop").hidden = true;
        }
      });

      function syncVisualViewport() {
        var viewport = window.visualViewport;
        var height = viewport ? viewport.height : window.innerHeight;
        var offsetTop = viewport ? viewport.offsetTop : 0;
        document.documentElement.style.setProperty("--visual-viewport-height", height + "px");
        document.documentElement.style.setProperty("--visual-viewport-top", offsetTop + "px");
      }

      syncVisualViewport();
      window.addEventListener("resize", syncVisualViewport, { passive: true });
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncVisualViewport, { passive: true });
        window.visualViewport.addEventListener("scroll", syncVisualViewport, { passive: true });
      }

      if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("./sw.js").catch(function () {
            console.warn("Service Worker 注册失败，页面仍可正常在线使用。");
          });
        });
      }

      applyTheme();
      render();
      loadFinanceNews();
    })();
