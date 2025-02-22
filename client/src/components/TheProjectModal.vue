<script setup lang="ts">
import type { IProject } from '@/types';

const props = defineProps<{
  project: IProject;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'exit:modal'): void;
  (e: 'update:title', title: string): void; // TODO: To be used in the future
}>();

const chore = useChoreStore();

const { name: title } = toRefs(props.project);

function deleteProject() {
  const shouldDelete = window.confirm('Are you sure?');

  if (!shouldDelete) {
    return;
  }

  chore.deleteProject(props.project.id as number);
  emit('exit:modal');

  const isLastProjectOnPage =
    chore.projectPagination.page === chore.totalProjectPages &&
    chore.projects.length === 1;

  if (isLastProjectOnPage) {
    chore.decreaseProjectPagination();
  }
}

function saveAndExit() {
  chore.saveProject(props.project, title.value);
  props.project.name = title.value;
  emit('exit:modal');
}

function exitModal() {
  if (title.value !== props.project.name) {
    props.project.name = title.value;
    chore.saveProject(props.project, title.value);
  }
  emit('exit:modal');
}
</script>

<template>
  <div>
    <!-- Modal -->
    <AppModal :open="open" @exit:modal="exitModal()">
      <!-- Title -->
      <template #title>
        <input
          type="text"
          name="title"
          class="w-[95%] border-none bg-transparent text-white font-bold text-[2rem] lg:w-full outline-none"
          maxlength="30"
          v-model="title"
          @keyup.ctrl.enter="saveAndExit()"
        />
      </template>
      <template #delete-icon>
        <DeleteIcon @click="deleteProject()" class="pointer mr-2.5" />
      </template>
      <!-- Modal Info -->
      <TheProjectModalBody :project="project" />
    </AppModal>
  </div>
</template>
