<script lang="ts">
  import { onMount } from 'svelte';
  import Router from 'svelte-spa-router';
  import { authStore } from './lib/stores/auth';
  import Login from './lib/components/Login.svelte';
  import Register from './lib/components/Register.svelte';
  import Navigation from './lib/components/Navigation.svelte';
  import UploadPage from './lib/pages/UploadPage.svelte';
  import ReceiptsPage from './lib/pages/ReceiptsPage.svelte';
  import ExportPage from './lib/pages/ExportPage.svelte';
  import './lib/services/queueProcessor'; // Initialize queue processor

  let showRegister = false;

  const routes = {
    '/': UploadPage,
    '/receipts': ReceiptsPage,
    '/export': ExportPage,
  };

  onMount(() => {
    // Listen for auth events
    window.addEventListener('auth-success', () => {
      // Auth store is already updated
    });

    window.addEventListener('switch-to-login', () => {
      showRegister = false;
    });

    window.addEventListener('switch-to-register', () => {
      showRegister = true;
    });
  });
</script>

{#if $authStore.isAuthenticated}
  <div class="min-h-screen bg-background">
    <Navigation />
    <Router {routes} />
  </div>
{:else}
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
    <div class="w-full max-w-md">
      {#if showRegister}
        <Register />
      {:else}
        <Login />
      {/if}
    </div>
  </div>
{/if}
