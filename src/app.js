(function () {
      "use strict";

      var STORAGE_KEY = "jackson.ai.workbench.v1.1";
      var knownModules = ["overview", "fitness", "finance", "todo"];
      var moduleMeta = {
        overview: { label: "今日总览", icon: "✦", subtitle: "把身体、资产和今天放进一个屏幕" },
        fitness: { label: "健身运动", icon: "💪", subtitle: "今天练什么，比计划本身更重要" },
        finance: { label: "财经资讯", icon: "📈", subtitle: "每日观察清单 · 当前为演示内容" },
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
          version: "1.1",
          active: "overview",
          theme: "system",
          sortMode: false,
          navOrder: ["overview", "fitness", "finance", "todo"],
          profile: null,
          workout: {
            planDate: null,
            planName: "",
            isRecovery: false,
            currentPlan: [],
            completedDates: []
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
        if (id === "fitness" && !state.profile) setTimeout(openSetup, 180);
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
        var trainingGoal = state.profile ? Number(state.profile.days) : 3;
        var weekDone = completedThisWeek();
        var trainingRate = Math.min(100, Math.round(weekDone / trainingGoal * 100));
        var dailyNews = getDailyNews();
        var priority = pendingTasks().slice().sort(sortTasks).slice(0, 5);
        var profileAction = state.profile ? "查看今日计划" : "建立训练档案";
        var profileClick = state.profile ? "setActive('fitness')" : "openSetup()";

        var priorityHtml = priority.length ? priority.map(function (task, index) {
          return "<div class=\"action-item\"><span class=\"action-index " + (index < 3 ? "rank-" + (index + 1) : "") + "\">" + (index + 1) + "</span><div class=\"item-copy\"><p class=\"item-title\">" + escapeHtml(task.title) + "</p><div class=\"item-meta\">" + escapeHtml(task.category) + " · " + priorityLabel(task.priority) + "优先级</div></div><button class=\"text-link\" type=\"button\" onclick=\"toggleTask('" + task.id + "')\">完成</button></div>";
        }).join("") : "<div class=\"empty-state\"><b>今天已经清空</b>去做点让自己开心的事吧。</div>";

        var newsHtml = dailyNews.slice(0, 3).map(function (item, index) {
          return "<div class=\"action-item\"><span class=\"action-index rank-" + (index + 1) + "\">" + (index + 1) + "</span><div class=\"item-copy\"><p class=\"item-title\">" + escapeHtml(item.title) + "</p><div class=\"item-meta\">" + item.category + " · " + item.time + "</div></div></div>";
        }).join("");

        return hero(formatLongDate(), greeting() + "，Jackson", "今天不用面面俱到：照顾身体、看清重要信息，然后完成最关键的几件事。") +
          "<section class=\"kpi-grid\">" +
            "<article class=\"kpi-card\"><div class=\"kpi-top\"><span class=\"kpi-icon\">💪</span><small>本周健身</small></div><div class=\"kpi-value\">" + weekDone + " / " + trainingGoal + " 次</div><button class=\"text-link\" type=\"button\" onclick=\"" + profileClick + "\">" + profileAction + " →</button><div class=\"progress\"><span style=\"width:" + trainingRate + "%\"></span></div></article>" +
            "<article class=\"kpi-card\"><div class=\"kpi-top\"><span class=\"kpi-icon\">📈</span><small>财经观察</small></div><div class=\"kpi-value\">5 条</div><button class=\"text-link\" type=\"button\" onclick=\"setActive('finance')\">查看今日精选 →</button><div class=\"progress\"><span style=\"width:100%\"></span></div></article>" +
            "<article class=\"kpi-card\"><div class=\"kpi-top\"><span class=\"kpi-icon\">✅</span><small>今日待办</small></div><div class=\"kpi-value\">" + doneCount + " / " + tasks.length + " 项</div><button class=\"text-link\" type=\"button\" onclick=\"setActive('todo')\">管理任务 →</button><div class=\"progress\"><span style=\"width:" + taskRate + "%\"></span></div></article>" +
          "</section>" +
          "<section class=\"section two-column\"><div><div class=\"section-heading\"><div><h3>今日行动</h3><p>按优先级聚合三个模块</p></div><button class=\"text-link\" type=\"button\" onclick=\"setActive('todo')\">全部待办</button></div><div class=\"action-list\">" + priorityHtml + "</div></div>" +
          "<div><div class=\"section-heading\"><div><h3>财经速读</h3><p>演示摘要，不代表实时新闻</p></div><button class=\"text-link\" type=\"button\" onclick=\"setActive('finance')\">查看 5 条</button></div><div class=\"action-list\">" + newsHtml + "</div></div></section>";
      }

      var exerciseCatalog = {
        bench: { focus: "胸部 · 三头", coeff: .34, sets: 4, reps: "8–10", rest: 90, gym: "杠铃卧推", dumbbell: "哑铃卧推", bodyweight: "俯卧撑", art: "press" },
        incline: { focus: "上胸 · 肩", coeff: .25, sets: 3, reps: "10–12", rest: 75, gym: "上斜哑铃卧推", dumbbell: "上斜哑铃卧推", bodyweight: "上斜俯卧撑", art: "press" },
        row: { focus: "背部 · 二头", coeff: .32, sets: 4, reps: "8–12", rest: 90, gym: "坐姿划船", dumbbell: "单臂哑铃划船", bodyweight: "俯身反向划船", art: "pull" },
        pulldown: { focus: "背阔肌", coeff: .36, sets: 3, reps: "10–12", rest: 75, gym: "高位下拉", dumbbell: "哑铃直臂上拉", bodyweight: "门框划船", art: "pull" },
        squat: { focus: "股四头 · 臀", coeff: .52, sets: 4, reps: "8–10", rest: 105, gym: "杠铃深蹲", dumbbell: "高脚杯深蹲", bodyweight: "自重深蹲", art: "squat" },
        hinge: { focus: "后链 · 臀腿", coeff: .58, sets: 3, reps: "8–10", rest: 105, gym: "罗马尼亚硬拉", dumbbell: "哑铃罗马尼亚硬拉", bodyweight: "单腿臀桥", art: "hinge" },
        lunge: { focus: "臀腿 · 稳定", coeff: .18, sets: 3, reps: "每侧 10", rest: 60, gym: "哑铃箭步蹲", dumbbell: "哑铃箭步蹲", bodyweight: "反向箭步蹲", art: "squat" },
        shoulder: { focus: "肩部 · 三头", coeff: .20, sets: 3, reps: "8–10", rest: 75, gym: "站姿推举", dumbbell: "哑铃肩推", bodyweight: "折刀俯卧撑", art: "press" },
        raise: { focus: "三角肌中束", coeff: .08, sets: 3, reps: "12–15", rest: 45, gym: "哑铃侧平举", dumbbell: "哑铃侧平举", bodyweight: "墙面肩部外展", art: "press" },
        core: { focus: "核心", coeff: 0, sets: 3, reps: "40 秒", rest: 45, gym: "平板支撑", dumbbell: "负重死虫", bodyweight: "平板支撑", art: "core" },
        walk: { focus: "低强度有氧", coeff: 0, sets: 1, reps: "25 分钟", rest: 0, gym: "坡度快走", dumbbell: "户外快走", bodyweight: "户外快走", art: "walk" },
        stretch: { focus: "髋、胸椎与肩", coeff: 0, sets: 1, reps: "8 分钟", rest: 0, gym: "全身动态拉伸", dumbbell: "全身动态拉伸", bodyweight: "全身动态拉伸", art: "stretch" },
        mobility: { focus: "关节活动度", coeff: 0, sets: 1, reps: "6 分钟", rest: 0, gym: "肩髋灵活性练习", dumbbell: "肩髋灵活性练习", bodyweight: "肩髋灵活性练习", art: "stretch" }
      };

      var planTemplates = {
        full: ["squat", "bench", "row", "hinge", "core"],
        upperA: ["bench", "row", "shoulder", "pulldown", "core"],
        upperB: ["incline", "pulldown", "shoulder", "row", "raise"],
        lowerA: ["squat", "hinge", "lunge", "core"],
        lowerB: ["hinge", "squat", "lunge", "core"],
        push: ["bench", "incline", "shoulder", "raise", "core"],
        pull: ["row", "pulldown", "hinge", "core"],
        legs: ["squat", "hinge", "lunge", "core"]
      };

      var schedules = {
        1: { days: [1], names: ["全身训练"], plans: ["full"] },
        2: { days: [1, 4], names: ["上肢训练", "下肢训练"], plans: ["upperA", "lowerA"] },
        3: { days: [1, 3, 5], names: ["推力日", "拉力日", "腿部日"], plans: ["push", "pull", "legs"] },
        4: { days: [1, 2, 4, 5], names: ["上肢 A", "下肢 A", "上肢 B", "下肢 B"], plans: ["upperA", "lowerA", "upperB", "lowerB"] },
        5: { days: [1, 2, 3, 5, 6], names: ["推力日", "拉力日", "腿部日", "上肢综合", "下肢综合"], plans: ["push", "pull", "legs", "upperB", "lowerB"] },
        6: { days: [1, 2, 3, 4, 5, 6], names: ["推力 A", "拉力 A", "腿部 A", "推力 B", "拉力 B", "腿部 B"], plans: ["push", "pull", "legs", "push", "pull", "legs"] }
      };

      function currentProgramWeek() {
        if (!state.profile || !state.profile.startedAt) return 1;
        var diff = Date.now() - new Date(state.profile.startedAt + "T12:00:00").getTime();
        return Math.min(12, Math.max(1, Math.floor(diff / 604800000) + 1));
      }

      function buildExercise(code) {
        var source = exerciseCatalog[code];
        var profile = state.profile;
        var equipment = profile.equipment;
        var levelFactor = { beginner: .72, intermediate: .9, advanced: 1.05 }[profile.level] || .72;
        var goalFactor = { muscle: 1, fatloss: .82, shape: .82, fitness: .75 }[profile.goal] || .82;
        var weekFactor = 1 + (currentProgramWeek() - 1) * .025;
        var usesExternalLoad = source.coeff > 0 && equipment !== "bodyweight";
        var weight = usesExternalLoad ? Math.max(2.5, Math.round((profile.weight * source.coeff * levelFactor * goalFactor * weekFactor) / 2.5) * 2.5) : null;
        return {
          id: uid("exercise"),
          code: code,
          name: source[equipment],
          focus: source.focus,
          sets: source.sets,
          reps: source.reps,
          rest: source.rest,
          weight: weight,
          completedSets: 0,
          art: source.art
        };
      }

      function ensureTodayPlan(force) {
        if (!state.profile) return;
        var today = dateKey();
        if (!force && state.workout.planDate === today && state.workout.currentPlan.length) return;
        var schedule = schedules[Number(state.profile.days)] || schedules[3];
        var day = new Date().getDay();
        var index = schedule.days.indexOf(day);
        var isRecovery = index < 0;
        var codes = isRecovery ? ["stretch", "walk", "mobility"] : planTemplates[schedule.plans[index]];
        state.workout.planDate = today;
        state.workout.planName = isRecovery ? "主动恢复日" : schedule.names[index];
        state.workout.isRecovery = isRecovery;
        state.workout.currentPlan = codes.map(buildExercise);
        saveState();
      }

      function workoutProgress() {
        var plan = state.workout.currentPlan;
        var total = plan.reduce(function (sum, exercise) { return sum + exercise.sets; }, 0);
        var complete = plan.reduce(function (sum, exercise) { return sum + exercise.completedSets; }, 0);
        return { total: total, complete: complete, rate: total ? Math.round(complete / total * 100) : 0 };
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

      function renderFitness() {
        if (!state.profile) {
          return hero("FITNESS", "先认识你的身体", "建立一份轻量档案，工作台会按训练天数、目标和器械生成每天的参考计划。") +
            "<section class=\"section panel\"><div class=\"empty-state\"><div style=\"font-size:48px;margin-bottom:12px\">🏋️</div><b>还没有训练档案</b><p>大约 1 分钟完成设置，之后仍可随时修改。</p><button class=\"primary-button\" type=\"button\" onclick=\"openSetup()\">开始建档</button></div></section>";
        }
        ensureTodayPlan(false);
        var progress = workoutProgress();
        var streak = calculateStreak();
        var plan = state.workout.currentPlan;
        var profile = state.profile;
        var goalLabels = { muscle: "增肌", fatloss: "减脂", shape: "塑形", fitness: "体能" };
        var equipmentLabels = { gym: "健身房", dumbbell: "居家哑铃", bodyweight: "徒手" };
        var exercises = plan.map(function (exercise, exerciseIndex) {
          var sets = [];
          for (var index = 0; index < exercise.sets; index += 1) {
            var checked = index < exercise.completedSets;
            var locked = index > exercise.completedSets;
            sets.push("<button class=\"set-button " + (checked ? "checked" : "") + " " + (locked ? "locked" : "") + "\" type=\"button\" onclick=\"toggleSet('" + exercise.id + "'," + index + ")\">" + (checked ? "✓ " : "") + "第 " + (index + 1) + " 组</button>");
          }
          var weight = exercise.weight == null
            ? "<div class=\"weight-control\"><span class=\"chip\">" + (exercise.code === "walk" || exercise.code === "stretch" || exercise.code === "mobility" ? "计时任务" : "自重训练") + "</span></div>"
            : "<div class=\"weight-control\"><button type=\"button\" onclick=\"changeWeight('" + exercise.id + "',-2.5)\" aria-label=\"减少重量\">−</button><strong>" + exercise.weight + " kg</strong><button type=\"button\" onclick=\"changeWeight('" + exercise.id + "',2.5)\" aria-label=\"增加重量\">＋</button></div>";
          return "<article id=\"exercise-" + exercise.id + "\" class=\"exercise-card " + (exercise.completedSets === exercise.sets ? "done" : "") + "\"><div class=\"exercise-art\">" + exerciseSvg(exercise.art) + "</div><div><div class=\"exercise-header\"><div><h4 class=\"exercise-title\">" + (exerciseIndex + 1) + ". " + escapeHtml(exercise.name) + "</h4><p class=\"exercise-subtitle\">" + exercise.focus + " · " + exercise.sets + " 组 × " + exercise.reps + "</p></div><span class=\"chip\">休息 " + exercise.rest + "s</span></div>" + weight + "<div class=\"set-row\">" + sets.join("") + "</div></div></article>";
        }).join("");

        return hero("第 " + currentProgramWeek() + " 周 · " + (state.workout.isRecovery ? "RECOVERY" : "TRAINING"), state.workout.planName, state.workout.isRecovery ? "恢复不是暂停，而是让下一次训练更有质量。" : "从第一组开始。动作稳定，比数字更重要。") +
          "<section class=\"section two-column\"><div class=\"panel profile-summary\"><div class=\"profile-ring\">" + progress.rate + "%</div><div class=\"item-copy\"><p class=\"item-title\">今日完成 " + progress.complete + " / " + progress.total + " 组</p><div class=\"profile-facts\"><span class=\"chip\">🔥 连续 " + streak + " 天</span><span class=\"chip\">" + goalLabels[profile.goal] + "</span><span class=\"chip\">" + equipmentLabels[profile.equipment] + "</span></div></div></div>" +
          "<div class=\"panel\"><div class=\"kpi-top\"><div><p class=\"item-title\">Jackson 的训练档案</p><div class=\"item-meta\">" + profile.height + " cm · " + profile.weight + " kg → " + profile.targetWeight + " kg · 每周 " + profile.days + " 天</div></div><button class=\"soft-button\" type=\"button\" onclick=\"openSetup()\">修改</button></div><div class=\"progress\"><span style=\"width:" + progress.rate + "%\"></span></div></div></section>" +
          "<div class=\"notice\">建议重量会在前 12 周以每周 2.5% 作为参考增幅，但不会替你判断身体状态。你可以随时用 ±2.5 kg 调整；如果无法保持动作质量，请降低重量或停止训练。</div>" +
          "<section class=\"section\"><div class=\"section-heading\"><div><h3>今日动作</h3><p>按顺序勾选；再次点击最后完成的一组可回退</p></div></div><div class=\"workout-list\">" + exercises + "</div></section>";
      }

      window.changeWeight = function (id, delta) {
        var exercise = state.workout.currentPlan.find(function (item) { return item.id === id; });
        if (!exercise || exercise.weight == null) return;
        exercise.weight = Math.max(0, Math.round((exercise.weight + delta) * 10) / 10);
        saveState();
        render();
      };

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
          ["height", "weight", "targetWeight", "level", "goal", "equipment", "days"].forEach(function (key) {
            var input = document.getElementById(key);
            if (input && profile[key] != null) input.value = profile[key];
          });
        }
        document.getElementById("setupBackdrop").hidden = false;
      };

      window.closeSetup = function () {
        document.getElementById("setupBackdrop").hidden = true;
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
        return selected;
      }

      function renderFinance() {
        var allNews = getDailyNews();
        var news = financeFilter === "全部" ? allNews : allNews.filter(function (item) { return item.category === financeFilter; });
        var buttons = ["全部", "美股", "A股", "宏观"].map(function (filter) {
          return "<button class=\"filter-button " + (financeFilter === filter ? "active" : "") + "\" type=\"button\" onclick=\"setFinanceFilter('" + filter + "')\">" + filter + "</button>";
        }).join("");
        var cards = news.map(function (item) {
          var originalIndex = allNews.indexOf(item);
          return "<article class=\"news-card\"><span class=\"news-rank " + (originalIndex < 3 ? "rank-" + (originalIndex + 1) : "") + "\">" + (originalIndex + 1) + "</span><div class=\"item-copy\"><div style=\"display:flex;gap:7px;flex-wrap:wrap;margin-bottom:7px\"><span class=\"category-chip\">" + item.category + "</span><span class=\"chip demo-badge\">演示摘要</span></div><p class=\"item-title\">" + escapeHtml(item.title) + "</p><p class=\"news-summary\">" + escapeHtml(item.summary) + "</p><div class=\"item-meta\">" + item.source + " · " + item.time + "</div></div><span class=\"chevron\">↗</span></article>";
        }).join("");
        return hero("FINANCE · 每日 09:00", "财经资讯", "用固定观察框架代替信息焦虑。V1.1 展示的是演示摘要，不是实时行情或投资建议。") +
          "<section class=\"section\"><div class=\"banner\"><span class=\"banner-icon\">📰</span><div>每日 9:00 更新 · 精选 5 条<small>确保覆盖美股、A 股与宏观；当前使用按日期轮换的本地内容池</small></div></div></section>" +
          "<div class=\"notice\">数据透明说明：下方内容用于演示信息结构，不声称是今日真实新闻。接入可靠新闻源前，所有卡片都会保留“演示摘要”标识。</div>" +
          "<section class=\"section\"><div class=\"section-heading\"><div><h3>今日观察清单</h3><p>先读框架，再决定是否深入研究</p></div></div><div class=\"filter-row\">" + buttons + "</div><div class=\"news-list\">" + cards + "</div></section>";
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
          days: Number(data.get("days")),
          startedAt: previousStart || dateKey()
        };
        ensureTodayPlan(true);
        saveState();
        closeSetup();
        state.active = "fitness";
        render();
        showToast("训练档案已保存");
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
    })();
