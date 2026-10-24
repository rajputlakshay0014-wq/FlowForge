import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3001/api";
const STATUSES = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "REVIEW", label: "In review" },
  { value: "DONE", label: "Done" },
];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

async function apiRequest(path, options = {}, token = "") {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.message || `Request failed (${response.status})`
    );
  }
  return data;
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("flowforge_token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("flowforge_user") || "null");
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState(() => {
    const savedView = localStorage.getItem("flowforge_active_view");
    return ["Dashboard", "Projects", "Tasks"].includes(savedView)
      ? savedView
      : "Dashboard";
  });
  const [selectedProject, setSelectedProject] = useState("all");
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [taskSearch, setTaskSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");

  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [backendStatus, setBackendStatus] = useState("Checking");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [topProfileMenuOpen, setTopProfileMenuOpen] = useState(false);

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  // Keep the current workspace page when the browser is refreshed.
  useEffect(() => {
    if (token) {
      localStorage.setItem("flowforge_active_view", activeView);
    }
  }, [activeView, token]);

  useEffect(() => {
    apiRequest("/health")
      .then(() => setBackendStatus("Online"))
      .catch(() => setBackendStatus("Offline"));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("flowforge_token");
    localStorage.removeItem("flowforge_user");
    localStorage.removeItem("flowforge_active_view");
    setToken("");
    setUser(null);
    setProjects([]);
    setTasks([]);
    setActiveView("Dashboard");
    setPassword("");
    setProfileMenuOpen(false);
    setTopProfileMenuOpen(false);
    clearMessages();
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const [projectData, taskData] = await Promise.all([
        apiRequest("/projects", {}, token),
        apiRequest("/tasks", {}, token),
      ]);
      setProjects(projectData.projects || []);
      setTasks(taskData.tasks || []);
      setBackendStatus("Online");
    } catch (err) {
      if (/token|unauthorized|authentication/i.test(err.message)) {
        logout();
        setError("Your session expired. Please sign in again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) loadWorkspace();
  }, [token, loadWorkspace]);

  const handleAuth = async (event) => {
    event.preventDefault();
    clearMessages();

    if (authMode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setSaving(true);
    try {
      const isSignup = authMode === "signup";
      const result = await apiRequest(
        isSignup ? "/auth/signup" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(
            isSignup
              ? { name: name.trim(), email: email.trim(), password }
              : { email: email.trim(), password }
          ),
        }
      );

      const newToken = result.token || result.accessToken;
      const newUser = result.user || result.data?.user || null;
      if (!newToken) {
        throw new Error(
          isSignup
            ? "Account created. Please switch to Sign in and log in."
            : "No login token was returned by the server."
        );
      }

      localStorage.setItem("flowforge_token", newToken);
      if (newUser) localStorage.setItem("flowforge_user", JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setPassword("");
      setNotice("Welcome to FlowForge!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createProject = async (event) => {
    event.preventDefault();
    clearMessages();
    setSaving(true);
    try {
      const result = await apiRequest(
        "/projects",
        {
          method: "POST",
          body: JSON.stringify({
            name: projectName.trim(),
            description: projectDescription.trim() || null,
          }),
        },
        token
      );
      setProjects((current) => [result.project, ...current]);
      setProjectName("");
      setProjectDescription("");
      setShowProjectForm(false);
      setNotice("Project created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditProject = (project) => {
    setEditingProject(project);
    setProjectName(project.name || "");
    setProjectDescription(project.description || "");
    clearMessages();
  };

  const updateProject = async (event) => {
    event.preventDefault();
    if (!editingProject) return;
    clearMessages();
    setSaving(true);
    try {
      const result = await apiRequest(
        `/projects/${editingProject.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: projectName.trim(),
            description: projectDescription.trim() || null,
          }),
        },
        token
      );
      setProjects((current) =>
        current.map((item) => item.id === editingProject.id ? result.project : item)
      );
      setEditingProject(null);
      setProjectName("");
      setProjectDescription("");
      setNotice("Project updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete project "${project.name}" and its tasks? This cannot be undone.`)) return;
    clearMessages();
    try {
      await apiRequest(`/projects/${project.id}`, { method: "DELETE" }, token);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setTasks((current) => current.filter((task) => task.projectId !== project.id));
      if (selectedProject === project.id) setSelectedProject("all");
      setNotice("Project deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskProjectId(selectedProject !== "all" ? selectedProject : projects[0]?.id || "");
    setTaskPriority("MEDIUM");
    setTaskDueDate("");
  };

  const createTask = async (event) => {
    event.preventDefault();
    clearMessages();
    if (!taskProjectId) {
      setError("Please choose a project for this task.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: taskTitle.trim(),
        projectId: taskProjectId,
        priority: taskPriority,
        description: taskDescription.trim() || null,
        ...(taskDueDate ? { dueDate: `${taskDueDate}T12:00:00.000Z` } : {}),
      };
      const result = await apiRequest(
        "/tasks",
        { method: "POST", body: JSON.stringify(payload) },
        token
      );
      setTasks((current) => [result.task, ...current]);
      resetTaskForm();
      setShowTaskForm(false);
      setNotice("Task created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskTitle(task.title || "");
    setTaskDescription(task.description || "");
    setTaskProjectId(task.projectId || "");
    setTaskPriority(task.priority || "MEDIUM");
    setTaskDueDate(toDateInputValue(task.dueDate));
    clearMessages();
  };

  const updateTask = async (event) => {
    event.preventDefault();
    if (!editingTask) return;
    clearMessages();
    setSaving(true);
    try {
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
        dueDate: taskDueDate ? `${taskDueDate}T12:00:00.000Z` : null,
      };
      const result = await apiRequest(
        `/tasks/${editingTask.id}`,
        { method: "PUT", body: JSON.stringify(payload) },
        token
      );
      const updatedTask = result?.task || { ...editingTask, ...payload };
      setTasks((current) =>
        current.map((item) => item.id === editingTask.id ? updatedTask : item)
      );
      setEditingTask(null);
      setNotice("Task updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (task, status) => {
    clearMessages();
    try {
      const result = await apiRequest(
        `/tasks/${task.id}`,
        { method: "PUT", body: JSON.stringify({ status }) },
        token
      );
      const updatedTask = result?.task || { ...task, status };
      setTasks((current) =>
        current.map((item) => item.id === task.id ? updatedTask : item)
      );
      setNotice("Task status updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    clearMessages();
    try {
      await apiRequest(`/tasks/${task.id}`, { method: "DELETE" }, token);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setNotice("Task deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const visibleTasks = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      const matchesProject = selectedProject === "all" || task.projectId === selectedProject;
      const matchesStatus = taskFilter === "ALL" || task.status === taskFilter;
      const matchesPriority = priorityFilter === "ALL" || (task.priority || "MEDIUM") === priorityFilter;
      const matchesSearch =
        !search ||
        (task.title || "").toLowerCase().includes(search) ||
        (task.description || "").toLowerCase().includes(search);
      return matchesProject && matchesStatus && matchesPriority && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "priority") {
        return PRIORITIES.indexOf(b.priority || "MEDIUM") - PRIORITIES.indexOf(a.priority || "MEDIUM");
      }
      if (sortBy === "dueDate") {
        return new Date(a.dueDate || "9999-12-31") - new Date(b.dueDate || "9999-12-31");
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [tasks, selectedProject, taskFilter, priorityFilter, taskSearch, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProject, taskFilter, priorityFilter, taskSearch, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / pageSize));
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleTasks.slice(start, start + pageSize);
  }, [visibleTasks, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const completedCount = tasks.filter((task) => task.status === "DONE").length;
  const inProgressCount = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const todoCount = tasks.filter((task) => task.status === "TODO").length;
  const reviewCount = tasks.filter((task) => task.status === "REVIEW").length;
  const overdueCount = tasks.filter((task) =>
    task.dueDate &&
    new Date(task.dueDate) < new Date(new Date().toDateString()) &&
    task.status !== "DONE"
  ).length;

  const projectNameFor = (id) => projects.find((project) => project.id === id)?.name || "Project";
  const openCreateTask = () => {
    resetTaskForm();
    setShowTaskForm(true);
    clearMessages();
  };
  const openCreateProject = () => {
    setProjectName("");
    setProjectDescription("");
    setShowProjectForm(true);
    clearMessages();
  };

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-intro">
          <div className="brand-mark">F</div>
          <p className="eyebrow">WORK SMARTER, TOGETHER</p>
          <h1>Make progress<br />feel effortless.</h1>
          <p className="intro-copy">
            One clear workspace for your projects, your tasks, and your team's next big idea.
          </p>
          <div className="intro-points">
            <span>✓ Organize projects</span>
            <span>✓ Track every task</span>
            <span>✓ Keep momentum going</span>
          </div>
          <div className="auth-footer">FlowForge · Team Collaboration & Project Management</div>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="mobile-brand"><span>F</span> FlowForge</div>
            <p className="eyebrow">{authMode === "login" ? "WELCOME BACK" : "GET STARTED"}</p>
            <h2>{authMode === "login" ? "Sign in to FlowForge" : "Create your account"}</h2>
            <p className="muted">
              {authMode === "login" ? "Pick up where you left off." : "Build your workspace and start making progress."}
            </p>
            <div className="auth-switch">
              <button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); clearMessages(); }}>Sign in</button>
              <button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); clearMessages(); }}>Create account</button>
            </div>
            <form onSubmit={handleAuth} className="form-stack">
              {authMode === "signup" && (
                <label>Full name
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required autoComplete="name" />
                </label>
              )}
              <label>Email address
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" />
              </label>
              <label>Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={authMode === "signup" ? 8 : 1} autoComplete={authMode === "login" ? "current-password" : "new-password"} />
              </label>
              {error && <div className="alert error">{error}</div>}
              {notice && <div className="alert success">{notice}</div>}
              <button className="primary-button full-button" disabled={saving}>
                {saving ? "Please wait..." : authMode === "login" ? "Sign in →" : "Create account →"}
              </button>
            </form>
            <div className="backend-note">
              <span className={`status-dot ${backendStatus === "Online" ? "online" : ""}`} />
              API {backendStatus}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="workspace">
      <style>{`
        .sidebar-brand { display: flex; align-items: center; gap: 12px; width: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; text-align: left; }
        .sidebar-brand:focus-visible { outline: 2px solid #43b4ff; outline-offset: 4px; border-radius: 8px; }
        .profile-area { position: relative; }
        .topbar-right { position: relative; }
        .top-profile-menu { position: absolute; top: calc(100% + 12px); right: 0; z-index: 40; min-width: 180px; max-width: 260px; padding: 10px 14px; border: 1px solid #2b3b53; border-radius: 12px; background: #152237; box-shadow: 0 14px 36px #0005; }
        .profile { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px; border: 0; border-radius: 8px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }\n        .profile:hover { background: #18263a; }\n        .profile:focus-visible { outline: 2px solid #43b4ff; outline-offset: 2px; }
        .profile-menu { position: absolute; left: 0; right: 0; bottom: calc(100% + 10px); z-index: 30; padding: 14px; border: 1px solid #2b3b53; border-radius: 12px; background: #152237; box-shadow: 0 14px 36px #0005; }
        .profile-menu-name { margin: 0 0 5px; color: #edf4ff; font-weight: 700; overflow-wrap: anywhere; }
        .profile-menu-email { margin: 0 0 12px; color: #9aacc5; font-size: 12px; overflow-wrap: anywhere; }
        .profile-menu-label { display: block; margin-bottom: 5px; color: #7f91ab; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        .profile-menu-logout { width: 100%; padding: 9px 11px; border: 1px solid #3a4c65; border-radius: 9px; background: #1b2a40; color: #e9f1ff; cursor: pointer; text-align: left; }
        .profile-menu-logout:hover { border-color: #43b4ff; background: #223752; }
        .task-title-cell > div { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; }
        .task-description { display: block; margin-top: 2px; line-height: 1.45; overflow-wrap: anywhere; }
        .task-controls { margin: 26px 0 20px; }
        .task-toolbar { display: grid; grid-template-columns: minmax(280px, 1.8fr) repeat(4, minmax(125px, 1fr)) auto; gap: 10px; align-items: center; }
        .task-search-wrap { min-width: 0; display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 15px; border: 1px solid #344660; border-radius: 13px; background: #111d30; color: #9aacc5; transition: border-color .2s, box-shadow .2s; }
        .task-search-wrap:focus-within { border-color: #43b4ff; box-shadow: 0 0 0 3px #38aaff20; }
        .search-glyph { font-size: 27px; line-height: 1; transform: rotate(-20deg); color: #55baff; }
        .task-search-wrap .task-search { width: 100%; min-width: 0; height: 100%; padding: 0; border: 0; outline: 0; box-shadow: none; background: transparent; color: #e9f1ff; font: inherit; }
        .task-search-wrap .task-search::placeholder { color: #7f91ab; }
        .clear-search { border: 0; background: transparent; color: #9aacc5; font-size: 23px; cursor: pointer; }
        .task-toolbar > select { width: 100%; min-width: 0; height: 48px; padding: 0 12px; border: 1px solid #344660; border-radius: 13px; background: #111d30; color: #dce7f8; font: inherit; }
        .task-toolbar > select:focus { outline: 2px solid #38aaff; outline-offset: 1px; }
        .refresh-button { height: 48px; white-space: nowrap; }
        .task-quick-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; margin-top: 16px; }
        .quick-filter { display: inline-flex; align-items: center; gap: 9px; padding: 9px 13px; border: 1px solid #2b3a52; border-radius: 999px; background: #121e31; color: #aebed3; font: inherit; font-size: 13px; cursor: pointer; transition: .18s ease; }
        .quick-filter span { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px; background: #26364d; color: #dce8fa; font-size: 11px; }
        .quick-filter:hover { border-color: #48b4ff; color: #fff; }
        .quick-filter.active { background: linear-gradient(110deg,#159bea,#4c72ff); border-color: transparent; color: white; box-shadow: 0 5px 18px #248dff28; }
        .quick-filter.active span { background: #ffffff2b; color: white; }
        .filter-result-count { margin-left: auto; color: #8799b3; font-size: 13px; }
        .pagination-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 17px 20px; border-top: 1px solid #26364c; }
        .pagination-summary { color: #91a2ba; font-size: 13px; }
        .pagination-summary strong { color: #e6eefb; }
        .pagination-controls { display: flex; align-items: center; gap: 7px; color: #9aaac0; font-size: 13px; }
        .page-size-control { display: flex; align-items: center; gap: 7px; margin-right: 8px; }
        .page-size-control select { padding: 8px 9px; border: 1px solid #344660; border-radius: 9px; background: #111d30; color: #e6eefb; }
        .page-button { display: grid; place-items: center; min-width: 34px; height: 34px; padding: 0 8px; border: 1px solid #344660; border-radius: 9px; background: #17253a; color: #dce8fa; font-size: 19px; cursor: pointer; }
        .page-button:disabled { opacity: .35; cursor: not-allowed; }
        .page-button:not(:disabled):hover { background: #218de4; border-color: #218de4; }
        .page-indicator { min-width: 82px; text-align: center; }
        @media (max-width: 1250px) { .task-toolbar { grid-template-columns: minmax(260px, 2fr) repeat(2, minmax(140px, 1fr)); } .refresh-button { width: 100%; } }
        @media (max-width: 700px) { .task-toolbar { grid-template-columns: 1fr 1fr; } .task-search-wrap { grid-column: 1 / -1; } .refresh-button { width: 100%; } .pagination-bar { align-items: flex-start; } .pagination-controls { flex-wrap: wrap; } .filter-result-count { width: 100%; margin-left: 0; } }
      `}</style>
      <aside className="sidebar">
        <button type="button" className="sidebar-brand" onClick={() => setActiveView("Dashboard")} aria-label="Go to dashboard"><span className="brand-mark small-mark">F</span><span>FlowForge</span></button>
        <p className="nav-label">WORKSPACE</p>
        <nav className="main-nav">
          {[["Dashboard", "▦"], ["Projects", "▤"], ["Tasks", "✓"]].map(([view, symbol]) => (
            <button key={view} className={activeView === view ? "nav-item active" : "nav-item"} onClick={() => setActiveView(view)}>
              <span className="nav-symbol">{symbol}</span>{view}
              {view === "Tasks" && <span className="nav-count">{tasks.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="api-indicator"><span className={`status-dot ${backendStatus === "Online" ? "online" : ""}`} />API {backendStatus}</div>
          <div className="profile-area">
            {profileMenuOpen && (
              <div className="profile-menu" role="region" aria-label="Account details">
                <span className="profile-menu-label">Account</span>
                <p className="profile-menu-name">{user?.name || "FlowForge user"}</p>
                <p className="profile-menu-email">{user?.email || email || "Email unavailable"}</p>
                <button type="button" className="profile-menu-logout" onClick={logout}>↪ Log out</button>
              </div>
            )}
            <button
              type="button"
              className="profile"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-expanded={profileMenuOpen}
              aria-label="Show account details"
            >
              <span className="avatar">{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</span>
              <span className="profile-text"><strong>{user?.name || "Your workspace"}</strong><span>{user?.email || email || "Signed in"}</span></span>
              <span className="logout-button" aria-hidden="true">⌄</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="breadcrumb">Workspace / </span><strong>{activeView}</strong></div>
          <div className="topbar-right">
            <span className="live-chip"><span className="status-dot online" />Workspace active</span>
            <button className="avatar top-avatar" type="button" title={user?.name || "Profile"} aria-label="Show account details" aria-expanded={topProfileMenuOpen} onClick={() => setTopProfileMenuOpen((open) => !open)}>{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</button>
            {topProfileMenuOpen && (
              <div className="top-profile-menu" role="status" aria-label="Account name">
                <p className="profile-menu-name">{user?.name || "FlowForge user"}</p>
              </div>
            )}
          </div>
        </header>

        <div className="page-content">
          {error && <div className="alert error page-alert">{error}<button onClick={() => setError("")}>×</button></div>}
          {notice && <div className="alert success page-alert">{notice}<button onClick={() => setNotice("")}>×</button></div>}

          {activeView === "Dashboard" && (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow">YOUR OVERVIEW</p><h1>Good to see you{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1><p className="muted">Here's what's happening across your workspace.</p></div>
                <button className="primary-button" onClick={openCreateProject}>+ New project</button>
              </section>
              <section className="stats-grid">
                <StatCard label="Total projects" value={projects.length} detail="In your workspace" symbol="▤" />
                <StatCard label="Total tasks" value={tasks.length} detail="Across all projects" symbol="✓" />
                <StatCard label="In progress" value={inProgressCount} detail="Work underway" symbol="◷" />
                <StatCard label="Completed" value={completedCount} detail="Tasks finished" symbol="↗" />
              </section>
              <section className="stats-grid extra-stats">
                <StatCard label="To do" value={todoCount} detail="Waiting to start" symbol="○" />
                <StatCard label="In review" value={reviewCount} detail="Ready for review" symbol="◉" />
                <StatCard label="Overdue" value={overdueCount} detail="Past due and unfinished" symbol="!" />
                <StatCard label="Completion" value={`${tasks.length ? Math.round(completedCount / tasks.length * 100) : 0}%`} detail="Overall task progress" symbol="↗" />
              </section>
              <section className="dashboard-grid">
                <div className="panel projects-panel">
                  <div className="panel-heading"><div><h2>Your projects</h2><p className="muted">Keep your work organized.</p></div><button className="text-button" onClick={() => setActiveView("Projects")}>View all →</button></div>
                  {projects.length === 0 ? (
                    <EmptyState title="Your first project starts here" text="Create a project to bring your tasks together." action="Create project" onClick={openCreateProject} />
                  ) : (
                    <div className="project-list">
                      {projects.slice(0, 5).map((project, index) => {
                        const projectTasks = tasks.filter((task) => task.projectId === project.id);
                        const done = projectTasks.filter((task) => task.status === "DONE").length;
                        const percent = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0;
                        return (
                          <div className="project-row" key={project.id}>
                            <button className={`project-icon color-${index % 4}`} onClick={() => { setSelectedProject(project.id); setActiveView("Tasks"); }}>{(project.name || "P").charAt(0).toUpperCase()}</button>
                            <button className="project-info" onClick={() => { setSelectedProject(project.id); setActiveView("Tasks"); }}>
                              <strong>{project.name}</strong><span>{projectTasks.length} tasks · {percent}% complete</span><div className="progress-track"><div style={{ width: `${percent}%` }} /></div>
                            </button>
                            <button className="icon-button" onClick={() => openEditProject(project)} title="Edit project">✎</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="panel activity-panel">
                  <div className="panel-heading"><div><h2>Task overview</h2><p className="muted">A snapshot of your workload.</p></div></div>
                  <div className="task-overview-list">
                    <OverviewRow label="To do" value={todoCount} total={tasks.length} className="todo" />
                    <OverviewRow label="In progress" value={inProgressCount} total={tasks.length} className="progress" />
                    <OverviewRow label="In review" value={reviewCount} total={tasks.length} className="review" />
                    <OverviewRow label="Completed" value={completedCount} total={tasks.length} className="done" />
                  </div>
                  <button className="secondary-button full-button" onClick={() => setActiveView("Tasks")}>Manage tasks →</button>
                </div>
              </section>
              <TaskSection tasks={visibleTasks.slice(0, 5)} projects={projects} onStatusChange={updateTaskStatus} onEdit={openEditTask} onDelete={deleteTask} onViewAll={() => setActiveView("Tasks")} />
            </>
          )}

          {activeView === "Projects" && (
            <>
              <section className="welcome-row"><div><p className="eyebrow">ORGANIZE YOUR WORK</p><h1>Projects</h1><p className="muted">Create, edit, and manage your projects.</p></div><button className="primary-button" onClick={openCreateProject}>+ New project</button></section>
              <section className="project-grid">
                {projects.map((project, index) => {
                  const projectTasks = tasks.filter((task) => task.projectId === project.id);
                  const done = projectTasks.filter((task) => task.status === "DONE").length;
                  const percent = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0;
                  return (
                    <article className="project-card" key={project.id}>
                      <div className="project-card-top"><div className={`project-icon large-icon color-${index % 4}`}>{(project.name || "P").charAt(0).toUpperCase()}</div><div className="inline-actions"><button className="icon-button" onClick={() => openEditProject(project)} title="Edit project">✎</button><button className="icon-button danger-text" onClick={() => deleteProject(project)} title="Delete project">×</button></div></div>
                      <h2>{project.name}</h2><p className="muted project-description">{project.description || "No description added yet."}</p>
                      <div className="project-card-meta"><span>{projectTasks.length} tasks</span><span>{percent}% complete</span></div>
                      <div className="progress-track"><div style={{ width: `${percent}%` }} /></div>
                      <div className="project-card-actions"><button className="secondary-button full-button" onClick={() => { setSelectedProject(project.id); setActiveView("Tasks"); }}>View tasks →</button><button className="secondary-button" onClick={() => openEditProject(project)}>Edit</button></div>
                    </article>
                  );
                })}
                {projects.length === 0 && <EmptyState title="No projects yet" text="Create your first project to get started." action="Create project" onClick={openCreateProject} />}
              </section>
            </>
          )}

          {activeView === "Tasks" && (
            <>
              <section className="welcome-row"><div><p className="eyebrow">MAKE THINGS HAPPEN</p><h1>Tasks</h1><p className="muted">Track, search, update, and organize your work.</p></div><button className="primary-button" onClick={openCreateTask} disabled={projects.length === 0}>+ New task</button></section>
              <section className="task-controls">
                <div className="task-toolbar">
                  <label className="task-search-wrap" aria-label="Search tasks">
                    <span className="search-glyph" aria-hidden="true">⌕</span>
                    <input className="task-search" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Search tasks by title or description..." />
                    {taskSearch && <button type="button" className="clear-search" onClick={() => setTaskSearch("")} aria-label="Clear search">×</button>}
                  </label>
                  <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} aria-label="Filter by project"><option value="all">All projects</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select>
                  <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)} aria-label="Filter by status"><option value="ALL">All statuses</option>{STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select>
                  <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority"><option value="ALL">All priorities</option>{PRIORITIES.map((priority) => <option value={priority} key={priority}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</option>)}</select>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort tasks"><option value="newest">Newest first</option><option value="title">Title A–Z</option><option value="priority">Priority</option><option value="dueDate">Due date</option></select>
                  <button className="secondary-button refresh-button" onClick={loadWorkspace} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
                </div>
                <div className="task-quick-filters" aria-label="Quick status filters">
                  <button className={taskFilter === "ALL" ? "quick-filter active" : "quick-filter"} onClick={() => setTaskFilter("ALL")}>All <span>{tasks.filter(t => selectedProject === "all" || t.projectId === selectedProject).length}</span></button>
                  {STATUSES.map((status) => {
                    const count = tasks.filter((task) => (selectedProject === "all" || task.projectId === selectedProject) && task.status === status.value).length;
                    return <button key={status.value} className={taskFilter === status.value ? `quick-filter active ${status.value.toLowerCase()}` : `quick-filter ${status.value.toLowerCase()}`} onClick={() => setTaskFilter(status.value)}>{status.label} <span>{count}</span></button>;
                  })}
                  <span className="filter-result-count">{visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"} found</span>
                </div>
              </section>
              {projects.length === 0 ? <EmptyState title="Create a project first" text="Every task belongs to a project in FlowForge." action="Create project" onClick={openCreateProject} /> : (
                <TaskSection
                  tasks={paginatedTasks}
                  projects={projects}
                  onStatusChange={updateTaskStatus}
                  onEdit={openEditTask}
                  onDelete={deleteTask}
                  pagination={{
                    currentPage,
                    totalPages,
                    pageSize,
                    totalItems: visibleTasks.length,
                    onPageChange: setCurrentPage,
                    onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
                  }}
                />
              )}
            </>
          )}
          {loading && <p className="loading-note">Loading your workspace…</p>}
        </div>
      </main>

      {showProjectForm && (
        <Modal title="Create a project" onClose={() => setShowProjectForm(false)}>
          <form className="form-stack" onSubmit={createProject}>
            <label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Website redesign" required autoFocus maxLength={100} /></label>
            <label>Description <span className="optional-label">Optional</span><textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="What are you working on?" rows="3" maxLength={1000} /></label>
            <button className="primary-button full-button" disabled={saving}>{saving ? "Creating..." : "Create project"}</button>
          </form>
        </Modal>
      )}

      {editingProject && (
        <Modal title="Edit project" onClose={() => setEditingProject(null)}>
          <form className="form-stack" onSubmit={updateProject}>
            <label>Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} required autoFocus maxLength={100} /></label>
            <label>Description <span className="optional-label">Optional</span><textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} rows="3" maxLength={1000} /></label>
            <button className="primary-button full-button" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
          </form>
        </Modal>
      )}

      {showTaskForm && (
        <Modal title="Create a task" onClose={() => setShowTaskForm(false)}>
          <form className="form-stack" onSubmit={createTask}>
            <label>Task title<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="What needs to get done?" required autoFocus maxLength={200} /></label>
            <label>Description <span className="optional-label">Optional</span><textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Add task details..." rows="3" maxLength={2000} /></label>
            <label>Project<select value={taskProjectId} onChange={(event) => setTaskProjectId(event.target.value)} required><option value="">Choose a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label>Priority<select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)}>{PRIORITIES.map((priority) => <option value={priority} key={priority}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</option>)}</select></label>
            <label>Due date <span className="optional-label">Optional</span><input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} min="2000-01-01" /></label>
            <p className="form-hint">Created date is recorded automatically when you save the task.</p>
            <button className="primary-button full-button" disabled={saving}>{saving ? "Creating..." : "Create task"}</button>
          </form>
        </Modal>
      )}

      {editingTask && (
        <Modal title="Edit task" onClose={() => setEditingTask(null)}>
          <form className="form-stack" onSubmit={updateTask}>
            <label>Task title<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required autoFocus maxLength={200} /></label>
            <label>Description <span className="optional-label">Optional</span><textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} rows="3" maxLength={2000} /></label>
            <div className="edit-task-project"><span className="field-label">Project</span><div className="project-tag">{projects.find((project) => project.id === editingTask.projectId)?.name || "Project"}</div><p className="form-hint">To move a task to another project, create it in that project instead.</p></div>
            <label>Priority<select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)}>{PRIORITIES.map((priority) => <option value={priority} key={priority}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</option>)}</select></label>
            <label>Due date <span className="optional-label">Optional</span><input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} /></label>
            <p className="form-hint">Created: {formatDate(editingTask.createdAt)} · Task creation date is preserved.</p>
            <button className="primary-button full-button" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, symbol }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-symbol">{symbol}</span></div><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span></article>;
}

function OverviewRow({ label, value, total, className }) {
  const percent = total ? Math.round(value / total * 100) : 0;
  return <div className="overview-row"><div className="overview-label"><span className={`legend-dot ${className}`} />{label}<strong>{value}</strong></div><div className="progress-track"><div className={className} style={{ width: `${percent}%` }} /></div></div>;
}

function EmptyState({ title, text, action, onClick }) {
  return <div className="empty-state"><div className="empty-icon">✳</div><h3>{title}</h3><p>{text}</p><button className="secondary-button" onClick={onClick}>{action} +</button></div>;
}

function TaskSection({ tasks, projects, onStatusChange, onEdit, onDelete, onViewAll, pagination }) {
  const projectName = (id) => projects.find((project) => project.id === id)?.name || "Project";
  return (
    <section className="panel tasks-panel">
      <div className="panel-heading"><div><h2>Task list</h2><p className="muted">Update progress and manage every task.</p></div>{onViewAll && <button className="text-button" onClick={onViewAll}>View all →</button>}</div>
      {tasks.length === 0 ? <div className="empty-state compact-empty"><div className="empty-icon">✓</div><h3>Nothing on your list yet</h3><p>Create a task or change your filters.</p></div> : (
        <div className="task-table-wrap">
          <table className="task-table">
            <thead><tr><th>Task</th><th>Project</th><th>Priority</th><th>Created</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{tasks.map((task) => (
              <tr key={task.id}>
                <td><div className="task-title-cell"><span className={`task-check ${task.status === "DONE" ? "checked" : ""}`}>{task.status === "DONE" ? "✓" : ""}</span><div><strong>{task.title}</strong>{task.description && <small className="task-description">{task.description}</small>}</div></div></td>
                <td><span className="project-tag">{projectName(task.projectId)}</span></td>
                <td><span className={`priority-badge priority-${(task.priority || "MEDIUM").toLowerCase()}`}>{task.priority || "MEDIUM"}</span></td>
                <td className="date-cell">{formatDate(task.createdAt)}</td>
                <td className="date-cell">{formatDate(task.dueDate)}</td>
                <td><select className={`status-select status-${(task.status || "TODO").toLowerCase()}`} value={task.status || "TODO"} onChange={(event) => onStatusChange(task, event.target.value)} aria-label={`Status for ${task.title}`}>{STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></td>
                <td><div className="inline-actions"><button className="icon-button" onClick={() => onEdit(task)} title="Edit task" aria-label={`Edit ${task.title}`}>✎</button><button className="icon-button danger-text" onClick={() => onDelete(task)} title="Delete task" aria-label={`Delete ${task.title}`}>×</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {pagination && pagination.totalItems > 0 && (
        <div className="pagination-bar">
          <div className="pagination-summary">
            Showing <strong>{Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalItems)}</strong>–<strong>{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)}</strong> of <strong>{pagination.totalItems}</strong> tasks
          </div>
          <div className="pagination-controls">
            <label className="page-size-control">Rows
              <select value={pagination.pageSize} onChange={(event) => pagination.onPageSizeChange(Number(event.target.value))} aria-label="Rows per page">
                <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
              </select>
              per page
            </label>
            <button className="page-button" onClick={() => pagination.onPageChange(1)} disabled={pagination.currentPage === 1} aria-label="First page">«</button>
            <button className="page-button" onClick={() => pagination.onPageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} aria-label="Previous page">‹</button>
            <span className="page-indicator">Page <strong>{pagination.currentPage}</strong> of {pagination.totalPages}</span>
            <button className="page-button" onClick={() => pagination.onPageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages} aria-label="Next page">›</button>
            <button className="page-button" onClick={() => pagination.onPageChange(pagination.totalPages)} disabled={pagination.currentPage >= pagination.totalPages} aria-label="Last page">»</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card"><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close modal">×</button></div>{children}</section></div>;
}

export default App;
