<script lang="ts">
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import { apiClient } from '$lib/api/client';
  import Card from './Card.svelte';
  import Button from './Button.svelte';
  import { CheckCircle, XCircle, Loader2, Clock, Trash2, X, RotateCw } from 'lucide-svelte';
  
  let showCompleted = true;
  let expanded = true;
  let retryingUploads = new Set<string>();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-muted-foreground';
      case 'uploading': return 'text-blue-600';
      case 'processing': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending': return Clock;
      case 'uploading': return Loader2;
      case 'processing': return Loader2;
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      default: return Clock;
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Queued';
      case 'uploading': return 'Uploading';
      case 'processing': return 'Processing';
      case 'success': return 'Complete';
      case 'error': return 'Failed';
      default: return status;
    }
  }

  $: filteredUploads = showCompleted 
    ? $receiptQueue.uploads 
    : $receiptQueue.uploads.filter(u => u.status !== 'success' && u.status !== 'error');

  $: activeCount = $receiptQueue.uploads.filter(
    u => u.status === 'uploading' || u.status === 'processing'
  ).length;

  $: completedCount = $receiptQueue.uploads.filter(u => u.status === 'success').length;
  $: errorCount = $receiptQueue.uploads.filter(u => u.status === 'error').length;
  $: pendingCount = $receiptQueue.uploads.filter(u => u.status === 'pending').length;

  async function retryUpload(upload: any) {
    if (!upload.result?.uploadId) {
      // If upload failed before getting an uploadId, we can't retry via API
      // Just re-add the file to queue
      receiptQueue.removeUpload(upload.id);
      receiptQueue.addUpload(upload.file);
      return;
    }

    const uploadId = upload.result.uploadId;
    retryingUploads.add(upload.id);
    retryingUploads = retryingUploads;

    try {
      await apiClient.reprocessReceipt(uploadId);
      
      // Update the upload status to processing
      receiptQueue.setStatus(upload.id, 'processing', 0);
      
      // Wait a bit and then check status
      setTimeout(() => {
        retryingUploads.delete(upload.id);
        retryingUploads = retryingUploads;
      }, 2000);
      
    } catch (err: any) {
      console.error('Failed to retry upload:', err);
      retryingUploads.delete(upload.id);
      retryingUploads = retryingUploads;
    }
  }
</script>

{#if $receiptQueue.uploads.length > 0}
  <Card class="p-4">
    <div class="flex items-center justify-between mb-4">
      <button
        class="flex items-center gap-2 text-lg font-semibold"
        on:click={() => expanded = !expanded}
      >
        <span>Upload Queue</span>
        <span class="text-sm font-normal text-muted-foreground">
          ({$receiptQueue.uploads.length} {$receiptQueue.uploads.length === 1 ? 'item' : 'items'})
        </span>
      </button>
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          on:click={() => showCompleted = !showCompleted}
        >
          {showCompleted ? 'Hide Completed' : 'Show All'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          on:click={() => receiptQueue.clearCompleted()}
          disabled={completedCount === 0 && errorCount === 0}
        >
          Clear Completed
        </Button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-4">
      <div class="text-center">
        <p class="text-2xl font-bold text-muted-foreground">{pendingCount}</p>
        <p class="text-xs text-muted-foreground">Queued</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-blue-600">{activeCount}</p>
        <p class="text-xs text-muted-foreground">Active</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-green-600">{completedCount}</p>
        <p class="text-xs text-muted-foreground">Success</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-destructive">{errorCount}</p>
        <p class="text-xs text-muted-foreground">Failed</p>
      </div>
    </div>

    {#if expanded}
      <div class="space-y-2 max-h-[500px] overflow-y-auto">
        {#each filteredUploads as upload (upload.id)}
          <div class="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
            <div class="flex items-start gap-3">
              <!-- Status Icon -->
              <div class={getStatusColor(upload.status)}>
                {#if upload.status === 'uploading' || upload.status === 'processing'}
                  <Loader2 class="w-5 h-5 animate-spin" />
                {:else}
                  <svelte:component this={getStatusIcon(upload.status)} class="w-5 h-5" />
                {/if}
              </div>

              <!-- Upload Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{upload.file.name}</p>
                    <p class="text-xs text-muted-foreground">
                      {formatFileSize(upload.file.size)} • {getStatusText(upload.status)}
                    </p>
                  </div>
                  <div class="flex items-center gap-1">
                    {#if upload.status === 'error' || (upload.status === 'success' && upload.result?.failed_receipts?.length > 0)}
                      <button
                        class="text-orange-600 hover:text-orange-700 p-1"
                        on:click={() => retryUpload(upload)}
                        disabled={retryingUploads.has(upload.id)}
                        title="Retry processing"
                      >
                        <RotateCw class="{retryingUploads.has(upload.id) ? 'w-4 h-4 animate-spin' : 'w-4 h-4'}" />
                      </button>
                    {/if}
                    <button
                      class="text-muted-foreground hover:text-foreground p-1"
                      on:click={() => receiptQueue.removeUpload(upload.id)}
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Progress Bar -->
                {#if upload.status === 'uploading' || upload.status === 'processing'}
                  <div class="mt-2">
                    <div class="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        class="h-full bg-primary transition-all duration-300"
                        style="width: {upload.progress}%"
                      ></div>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">{upload.progress}%</p>
                  </div>
                {/if}

                <!-- Error Message -->
                {#if upload.status === 'error' && upload.error}
                  <p class="text-xs text-destructive mt-1">{upload.error}</p>
                {/if}

                <!-- Success Result -->
                {#if upload.status === 'success' && upload.result}
                  <div class="mt-2 text-xs">
                    {#if upload.result.successful_receipts && upload.result.successful_receipts.length > 0}
                      <div class="flex flex-wrap gap-2">
                        {#each upload.result.successful_receipts as receipt}
                          <div class="bg-green-50 text-green-700 px-2 py-1 rounded">
                            {receipt.data.merchantName || 'Unknown'} - {formatCurrency(receipt.data.total || 0)}
                          </div>
                        {/each}
                      </div>
                    {/if}
                    {#if upload.result.failed_receipts && upload.result.failed_receipts.length > 0}
                      <p class="text-destructive mt-1">
                        {upload.result.failed_receipts.length} receipt(s) failed to process
                      </p>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Card>
{/if}
