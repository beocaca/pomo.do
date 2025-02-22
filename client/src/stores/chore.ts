import type { IProject, ITag, ITask, IStat } from '@/types';
import { defineStore } from 'pinia';
import axios from 'axios';
import { useFetch } from '@/composables/useFetch';
import { useAlertStore } from './alerts';
import { useAuthStore } from './auth';
import { ref, reactive, computed } from 'vue';

export const useChoreStore = defineStore('chores', () => {
  const tasks = ref<ITask[]>([]);
  const projects = ref<IProject[]>([]);
  const tags = ref<ITag[]>([]);
  const stats = ref<IStat[]>([]);

  const projectPagination = reactive({
    count: 0,
    page: 1,
    added: 1,
    page_size: 2,
  });
  const taskPagination = reactive({
    count: 0,
    page: 1,
    added: 1,
    page_size: 4,
  });

  fetchProjects();
  fetchTasks();  
  
  const totalProjectPages = computed(() => Math.ceil(projectPagination.count / projectPagination.page_size));
  const totalTaskPages = computed(() => Math.ceil(taskPagination.count / taskPagination.page_size));

  function decreaseProjectPagination() {
    projectPagination.page -= 1;
    projectPagination.count -= 1;
    projectPagination.added -= 1;
  }
  function decreaseTaskPagination() {
    taskPagination.page -= 1;
    taskPagination.count -= 1;
    taskPagination.added -= 1;
  }
  function previousProjectPage() {
    if (projectPagination.page > 1) {
      projectPagination.page--;
    }
  }
  function setProjectPage(page: number) {
    projectPagination.page = page;
  }
  function setProjectAdded(added: number) {
    projectPagination.added = added;
  }
  function nextProjectPage() {
    if (projectPagination.page < totalProjectPages.value) {
      projectPagination.page++;
    }
  }
  function previousTaskPage() {
    if (taskPagination.page > 1) {
      taskPagination.page--;
    }
  }
  function setTaskPage(page: number) {
    taskPagination.page = page;
  }
  function setTaskAdded(added: number) {
    taskPagination.added = added;
  }
  function nextTaskPage() {
    if (taskPagination.page < totalTaskPages.value) {
      taskPagination.page++;
    }
  }
  async function fetchModes() {
    const { status, data } = await useFetch('modes', 'get');
    if (status === 200) {
      const modes = JSON.stringify(data);
      localStorage.setItem('modes', modes);
    }
  }
  async function fetchStats() {
    const { data, status } = await useFetch('stats', 'get');
    if (status === 200) {
      stats.value = data;
    }
  }
  async function increaseTodayStats() {
    const date = new Date();
    date.setHours(date.getHours() - date.getTimezoneOffset() / 60);

    const { data, status } = await useFetch('stats', 'post', {
      day: date.toISOString().slice(0, 10),
    });
    if (status === 201) {
      let stat = stats.value.find((stat) => stat.id === data.id);

      if (stat) {
        stat.chores_done = data.chores_done;
      }
    }
  }
  async function fetchTasks() {
    const { page, page_size } = taskPagination;
    const { data, status } = await axios.get('tasks/', {
      params: { page, page_size }
    });

    if (status === 200) {
      tasks.value = data.results;
      taskPagination.count = data.count;
    }
  }
  async function fetchProjects() {
    const { page, page_size } = projectPagination;
    const { data, status } = await axios.get('projects/', {
      params: { page, page_size }
    });

    if (status === 200) {
      projects.value = data.results;
      projectPagination.count = data.count;
    }
  }
  async function fetchTags() {
    const { data, status } = await useFetch('tags', 'get');

    if (status === 200) {
      return (tags.value = data);
    }
  }
  async function changeCurrentTask(id: number | undefined) {
    const { data, status } = await useFetch('currentTask', 'put', { id });

    if (status === 200) {
      useAuthStore().user!.current_task_id = data.id;
    }
  }
  // Fetch all chores from user (request.user in django)
  function fetchAll() {
    const auth = useAuthStore();
    if (auth.isAuthed) {
      fetchModes();
      fetchTags();
    }
  }
  // Adds tasks with tags and subtasks
  async function addTask(task: ITask) {
    const { status } = await useFetch('tasks', 'post', task);
    if (status === 201) {
      useAlertStore().success(`Task ${task.title} created!`);
      // Send user to the first page
      taskPagination.page = 1;
      fetchTasks();
    }
  }
  async function saveTask(task: ITask) {
    const { status } = await axios.put(`tasks/${task.id}/`, task);
    if (status === 200) {
      useAlertStore().success(`'${task.title}' saved!`);
      fetchTasks();
    }
  }
  async function deleteTask(task: ITask) {
    const { status } = await useFetch('tasks', 'delete', null, task.id);

    if (status === 204) {
      // if it is the last
      if (tasks.value.length === 1 && taskPagination.count === 0) {
        tasks.value = tasks.value.filter((t: ITask) => t.id !== task.id);
        taskPagination.page = 1;
      } else {
        fetchTasks();
      }

      const auth = useAuthStore();

      useAlertStore().info(`Task '${task.title}' deleted`);

      if (task.id === auth.user!.current_task_id) {
        auth.user!.current_task_id = 0;
      }
    }
  }
  async function addProject(project: IProject) {
    const { status } = await useFetch('projects', 'post', project);

    if (status === 201) {
      useAlertStore().success(`Project ${project.name} created!`);
      // Send user to the first page
      projectPagination.page = 1;
      fetchProjects();
    }
  }
  async function saveProject(project: IProject, newProjectName: string) {
    const { status } = await axios.patch(
      `/projects/${project.id}/modify_title/`,
      {
        name: newProjectName,
      }
    );

    if (status === 200) {
      useAlertStore().success('Project saved!');
    }
  }
  async function deleteProject(id: number) {
    const { status } = await useFetch('projects', 'delete', null, id);

    if (status === 204) {
      if (projects.value.length === 1 && projectPagination.count === 0) {
        projects.value = projects.value.filter((p: IProject) => p.id !== id);
        projectPagination.page = 1;
      } else {
        fetchProjects();
      }
      useAlertStore().info('Project deleted!');
    }
  }
  async function incrementGoneThrough() {
    increaseTodayStats();
    const auth = useAuthStore();

    if (auth.user?.current_task_id) {
      const { status } = await useFetch(
        'tasks',
        'patch',
        {
          obj: 'task',
          action: 'increment_gone_through',
        },
        auth.user!.current_task_id
      );

      if (status === 200) {
        fetchTasks();
      }
    }
  }
  
  return {
    tasks, projects, tags, stats, projectPagination, taskPagination, totalProjectPages, totalTaskPages,
      decreaseProjectPagination, decreaseTaskPagination, previousProjectPage, setProjectPage, setProjectAdded,
      nextProjectPage, previousTaskPage, setTaskPage, setTaskAdded, nextTaskPage, 
      fetchModes, fetchStats, increaseTodayStats, fetchTasks, fetchProjects, fetchTags, changeCurrentTask, fetchAll,
    addTask, saveTask, deleteTask, addProject, saveProject, deleteProject, incrementGoneThrough
  }
}, { persist: true });
