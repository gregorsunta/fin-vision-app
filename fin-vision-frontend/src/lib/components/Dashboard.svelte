<script lang="ts">
  import { authStore } from '$lib/stores/auth';
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import { apiClient, ApiError } from '$lib/api/client';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import UploadReceipt from './UploadReceipt.svelte';
  import ReceiptQueue from './ReceiptQueue.svelte';
  import { LogOut, Download, Loader2 } from 'lucide-svelte';
  import '$lib/services/queueProcessor'; // Initialize queue processor

  let exportingCSV = false;
  let exportError = '';

  $: totalUploads = $receiptQueue.uploads.length;
  $: successfulUploads = $receiptQueue.uploads.filter(u => u.status === 'success').length;
  $: failedUploads = $receiptQueue.uploads.filter(u => u.status === 'error').length;
  $: activeUploads = $receiptQueue.uploads.filter(u => u.status === 'uploading' || u.status === 'processing').length;

  async function handleLogout() {
    try {
      await apiClient.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      authStore.logout();
    }
  }

  async function handleExportCSV() {
    exportError = '';
    exportingCSV = true;

    try {
      const blob = await apiClient.downloadCSV();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipts_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError) {
        exportError = err.message;
      } else {
        exportError = 'Failed to export receipts';
      }
    } finally {
      exportingCSV = false;
    }
  }
</script>

<div class="min-h-screen bg-background">
  <!-- Header -->
  <header class="border-b">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Fin Vision</h1>
        <p class="text-sm text-muted-foreground">Receipt Management System</p>
      </div>
      <div class="flex items-center gap-4">
        {#if $authStore.user}
          <span class="text-sm text-muted-foreground">{$authStore.user.email}</span>
        {/if}
        <Button variant="outline" on:click={handleLogout}>
          <LogOut class="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="container mx-auto px-4 py-8">
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <!-- Stats Cards -->
      <Card class="p-6">
        <h3 class="text-sm font-medium text-muted-foreground">Total Uploads</h3>
        <p class="text-3xl font-bold mt-2">{totalUploads}</p>
      </Card>

      <Card class="p-6">
        <h3 class="text-sm font-medium text-muted-foreground">Processing</h3>
        <p class="text-3xl font-bold mt-2 text-blue-600">{activeUploads}</p>
      </Card>

      <Card class="p-6">
        <h3 class="text-sm font-medium text-muted-foreground">Successful</h3>
        <p class="text-3xl font-bold mt-2 text-green-600">{successfulUploads}</p>
      </Card>

      <Card class="p-6">
        <h3 class="text-sm font-medium text-muted-foreground">Failed</h3>
        <p class="text-3xl font-bold mt-2 text-destructive">{failedUploads}</p>
      </Card>
    </div>

    <!-- Export Section -->
    <div class="mb-8">
      <Card class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold">Export Your Data</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Download all your receipts and items as a CSV file for Excel
            </p>
          </div>
          <div>
            {#if exportError}
              <p class="text-destructive text-sm mb-2">{exportError}</p>
            {/if}
            <Button
              on:click={handleExportCSV}
              disabled={exportingCSV}
              variant="outline"
            >
              {#if exportingCSV}
                <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              {:else}
                <Download class="w-4 h-4 mr-2" />
                Download CSV
              {/if}
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- Queue Display -->
    <div class="mb-8">
      <ReceiptQueue />
    </div>

    <!-- Upload Section -->
    <div class="max-w-4xl mx-auto">
      <UploadReceipt />
    </div>

    <!-- Instructions -->
    <Card class="mt-8 p-6 max-w-4xl mx-auto">
      <h3 class="text-lg font-semibold mb-4">How It Works</h3>
      <ol class="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>Upload an image containing one or more receipts</li>
        <li>Our AI will automatically detect and split multiple receipts</li>
        <li>Each receipt is analyzed to extract merchant name, total, tax, items, and more</li>
        <li>View the processed data immediately after upload</li>
        <li>Export all your data to CSV anytime for analysis in Excel or other tools</li>
      </ol>
    </Card>
  </main>
</div>
