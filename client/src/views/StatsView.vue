<script setup>
const auth = useAuthStore();
const Unauthed = defineAsyncComponent(() => import('../components/UnauthedChart.vue'));
const Authed = defineAsyncComponent(() => import('../components/AppChart.vue'));
</script>

<template>
  <div class="flex flex-col justify-center items-center text-white w-full">
    <h1 v-if="auth.isAuthed">Stats</h1>
    <div class="relative w-full" v-if="!auth.isAuthed">
      <div class="right-[18%] lg:right-[30%] absolute top-2/5 xl:right-2/5 z-4 text-[2rem]">
        <UnauthedLogin> To see your stats! </UnauthedLogin>
      </div>
      <Unauthed class="filter blur-md" />
    </div>
    <div v-else class="flex flex-col justify-center items-center w-full">
      <Suspense>
        <Authed class="w-full xl:w-[70%] text-black" />
      </Suspense>
    </div>
  </div>
</template>
