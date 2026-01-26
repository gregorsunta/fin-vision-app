<script lang="ts">
  import { authStore } from '$lib/stores/auth';
  import { createEventDispatcher } from 'svelte';
  import Button from './Button.svelte';
  import Input from './Input.svelte';
  import Label from './Label.svelte';
  import { AlertTriangle, X } from 'lucide-svelte';

  let isOpen = false;
  let isDeleting = false;
  let confirmText = '';
  let accessToken: string | null = null;

  const dispatch = createEventDispatcher();

  authStore.subscribe(value => {
    accessToken = value.accessToken;
  });

  async function handleDelete() {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    if (!accessToken) {
      alert('Authentication error. Please log in again.');
      return;
    }

    isDeleting = true;
    try {
      // Use fetch with automatic retry on 401
      const response = await fetchWithRetry('/api/users/me/data', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Data deletion successful:\n` +
          `  - ${result.deletedCounts.uploads} uploads\n` +
          `  - ${result.deletedCounts.receipts} receipts\n` +
          `  - ${result.deletedCounts.lineItems} line items\n` +
          `  - ${result.deletedCounts.files} files\n`
        );
        isOpen = false;
        dispatch('delete-success');
      } else {
        throw new Error(result.error || 'Failed to delete data.');
      }

    } catch (error) {
      alert(`❌ Failed to delete data: ${error.message}`);
    } finally {
      isDeleting = false;
    }
  }

  async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let response = await fetch(url, options);

    // If 401 and we have a token, try to refresh
    if (response.status === 401 && accessToken) {
      try {
        // Attempt to refresh the token
        const refreshResponse = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const { accessToken: newToken } = await refreshResponse.json();
          authStore.setAccessToken(newToken);
          
          // Retry the original request with the new token
          const retryOptions = {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          };
          response = await fetch(url, retryOptions);
        } else {
          // Refresh failed, logout user
          authStore.logout();
          throw new Error('Session expired. Please log in again.');
        }
      } catch (error) {
        authStore.logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  }

  function handleClose() {
    isOpen = false;
    confirmText = '';
  }
</script>

<div class="mt-8">
  <Button variant="destructive" on:click={() => (isOpen = true)}>
    Delete All My Data
  </Button>

  {#if isOpen}
    <!-- Modal Backdrop -->
    <div 
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      on:click={handleClose}
    >
      <!-- Modal Content -->
      <div 
        class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
        on:click|stopPropagation
      >
        <!-- Close Button -->
        <button
          on:click={handleClose}
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>

        <!-- Warning Icon -->
        <div class="flex items-center gap-3 mb-4">
          <div class="p-3 rounded-full bg-red-100">
            <AlertTriangle class="w-6 h-6 text-red-600" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Delete All Your Data?</h2>
        </div>

        <!-- Warning Content -->
        <div class="mb-6">
          <p class="text-gray-600 mb-3">
            This will permanently delete:
          </p>
          <ul class="list-disc list-inside space-y-1 text-gray-700 pl-4 mb-4">
            <li>All uploaded receipts</li>
            <li>All extracted data</li>
            <li>All images</li>
          </ul>
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-800 font-semibold text-sm">
              ⚠️ This action cannot be undone!
            </p>
          </div>
        </div>

        <!-- Confirmation Input -->
        <div class="mb-6">
          <Label for="confirm-delete" class="mb-2">
            Type <code class="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">DELETE</code> to confirm:
          </Label>
          <Input 
            id="confirm-delete"
            type="text" 
            bind:value={confirmText}
            placeholder="DELETE"
            class="w-full"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            on:click={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            on:click={handleDelete} 
            disabled={confirmText !== 'DELETE' || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>
