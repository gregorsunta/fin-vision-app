<script lang="ts">
  import { link, location } from 'svelte-spa-router';
  import { authStore } from '$lib/stores/auth';
  import { apiClient } from '$lib/api/client';
  import Button from './Button.svelte';
  import { Upload, FileText, Download, LogOut } from 'lucide-svelte';

  async function handleLogout() {
    try {
      await apiClient.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      authStore.logout();
      receiptQueue.clearAllData();
    }
  }

  function isActive(path: string): boolean {
    return $location === path;
  }
</script>

<nav class="bg-card/50 backdrop-blur-lg border-b sticky top-0 z-50">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex-shrink-0">
        <a href="/" use:link class="flex items-center gap-2 group">
          <div class="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <svg class="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <span class="text-xl font-bold">Fin Vision</span>
        </a>
      </div>

      <!-- Navigation Links -->
      <div class="flex items-center gap-1">
        <a
          href="/"
          use:link
          class="flex items-center gap-2 px-4 py-2 rounded-xl transition-all {isActive('/')
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
        >
          <Upload class="w-4 h-4" />
          <span class="font-medium">Upload</span>
        </a>

        <a
          href="/receipts"
          use:link
          class="flex items-center gap-2 px-4 py-2 rounded-xl transition-all {isActive('/receipts')
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
        >
          <FileText class="w-4 h-4" />
          <span class="font-medium">Receipts</span>
        </a>

        <a
          href="/export"
          use:link
          class="flex items-center gap-2 px-4 py-2 rounded-xl transition-all {isActive('/export')
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
        >
          <Download class="w-4 h-4" />
          <span class="font-medium">Export</span>
        </a>

        <div class="ml-2 pl-2">
          <Button variant="ghost" size="sm" on:click={handleLogout} class="rounded-xl">
            <LogOut class="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  </div>
</nav>
