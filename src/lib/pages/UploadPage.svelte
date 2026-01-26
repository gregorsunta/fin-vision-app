<script lang="ts">
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import { apiClient } from '$lib/api/client';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import { Upload, FileUp, CheckCircle, XCircle, Loader2, Clock, X, RotateCw } from 'lucide-svelte';
  
  let fileInput: HTMLInputElement;
  let isDragging = false;
  let retryingUploads = new Set<string>();

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      addFilesToQueue(Array.from(files));
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      addFilesToQueue(Array.from(target.files));
    }
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function addFilesToQueue(files: File[]) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select image files only');
      return;
    }

    if (imageFiles.length !== files.length) {
      alert(`${files.length - imageFiles.length} non-image file(s) were skipped`);
    }

    receiptQueue.addMultipleUploads(imageFiles);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing...';
      case 'success': return 'Complete';
      case 'error': return 'Failed';
      default: return status;
    }
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

  $: activeCount = $receiptQueue.uploads.filter(
    u => u.status === 'uploading' || u.status === 'processing'
  ).length;
  $: pendingCount = $receiptQueue.uploads.filter(u => u.status === 'pending').length;
  $: successCount = $receiptQueue.uploads.filter(u => u.status === 'success').length;
  $: errorCount = $receiptQueue.uploads.filter(u => u.status === 'error').length;

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
      alert(err.message || 'Failed to retry processing');
      retryingUploads.delete(upload.id);
      retryingUploads = retryingUploads;
    }
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/20">
  <div class="container mx-auto px-4 py-12">
    <div class="max-w-5xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold tracking-tight">Upload Receipts</h1>
        <p class="text-muted-foreground text-lg">Drop your receipt images and let AI do the work</p>
      </div>

      <!-- Upload Drop Zone -->
      <div class="relative">
        <div
          class="relative rounded-2xl p-16 text-center transition-all duration-200 {isDragging
            ? 'bg-primary/5 ring-2 ring-primary ring-offset-4'
            : 'bg-card/50 backdrop-blur-sm hover:bg-card/80'}"
          on:dragover={handleDragOver}
          on:dragleave={handleDragLeave}
          on:drop={handleDrop}
          role="button"
          tabindex="0"
        >
          <div class="flex flex-col items-center gap-6">
            <div class="p-4 rounded-full bg-primary/10">
              <Upload class="w-12 h-12 text-primary" />
            </div>
            <div class="space-y-2">
              <p class="text-2xl font-semibold">Drop your receipts here</p>
              <p class="text-muted-foreground">
                or click to browse • Multiple files supported
              </p>
            </div>
            <Button
              type="button"
              on:click={() => fileInput.click()}
              size="lg"
              class="mt-2"
            >
              <FileUp class="w-5 h-5 mr-2" />
              Select Files
            </Button>
          </div>

          <input
            type="file"
            bind:this={fileInput}
            on:change={handleFileSelect}
            accept="image/*"
            multiple
            class="hidden"
          />
        </div>

        <div class="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            JPEG, PNG
          </span>
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Max 10 MB
          </span>
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Auto-detection
          </span>
        </div>
      </div>

      <!-- Processing Queue -->
      {#if $receiptQueue.uploads.length > 0}
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold">Processing Queue</h2>
              <p class="text-muted-foreground mt-1">Monitor your uploads in real-time</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              on:click={() => receiptQueue.clearCompleted()}
              disabled={successCount === 0 && errorCount === 0}
            >
              Clear Completed
            </Button>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 transition-all hover:shadow-md">
              <div class="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-slate-200/50"></div>
              <div class="relative">
                <p class="text-sm font-medium text-muted-foreground mb-1">Queued</p>
                <p class="text-4xl font-bold text-slate-700">{pendingCount}</p>
              </div>
            </div>
            
            <div class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 transition-all hover:shadow-md">
              <div class="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-blue-200/50"></div>
              <div class="relative">
                <p class="text-sm font-medium text-blue-700 mb-1">Processing</p>
                <p class="text-4xl font-bold text-blue-600">{activeCount}</p>
              </div>
            </div>
            
            <div class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-6 transition-all hover:shadow-md">
              <div class="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-green-200/50"></div>
              <div class="relative">
                <p class="text-sm font-medium text-green-700 mb-1">Complete</p>
                <p class="text-4xl font-bold text-green-600">{successCount}</p>
              </div>
            </div>
            
            <div class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-6 transition-all hover:shadow-md">
              <div class="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-red-200/50"></div>
              <div class="relative">
                <p class="text-sm font-medium text-red-700 mb-1">Failed</p>
                <p class="text-4xl font-bold text-red-600">{errorCount}</p>
              </div>
            </div>
          </div>

          <!-- Queue Items -->
          <div class="space-y-3">
            {#each $receiptQueue.uploads as upload (upload.id)}
              <div class="group rounded-xl bg-card p-5 shadow-sm transition-all hover:shadow-md">
                <div class="flex items-center gap-4">
                  <!-- Status Icon -->
                  <div class="flex-shrink-0 {getStatusColor(upload.status)}">
                    {#if upload.status === 'uploading' || upload.status === 'processing'}
                      <Loader2 class="w-6 h-6 animate-spin" />
                    {:else}
                      <svelte:component this={getStatusIcon(upload.status)} class="w-6 h-6" />
                    {/if}
                  </div>

                  <!-- File Info -->
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold truncate">{upload.file.name}</p>
                    <p class="text-sm text-muted-foreground mt-0.5">
                      {formatFileSize(upload.file.size)} • {getStatusText(upload.status)}
                    </p>
                    
                    {#if upload.status === 'error' && upload.error}
                      <div class="mt-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-sm text-destructive">
                        {upload.error}
                      </div>
                    {/if}

                    {#if upload.status === 'success' && upload.result}
                      <div class="mt-2 flex items-center gap-2 text-sm">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          <CheckCircle class="w-3.5 h-3.5" />
                          {upload.result.successful_receipts?.length || 0} processed
                        </span>
                        {#if upload.result.failed_receipts?.length > 0}
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                            <XCircle class="w-3.5 h-3.5" />
                            {upload.result.failed_receipts.length} failed
                          </span>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex-shrink-0 flex items-center gap-2">
                    {#if upload.status === 'error'}
                      <button
                        class="p-2 rounded-lg text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors"
                        on:click={() => retryUpload(upload)}
                        disabled={retryingUploads.has(upload.id)}
                        aria-label="Retry"
                        title="Retry processing"
                      >
                        <RotateCw class="{retryingUploads.has(upload.id) ? 'w-5 h-5 animate-spin' : 'w-5 h-5'}" />
                      </button>
                    {/if}
                    {#if upload.status === 'success' && upload.result?.failed_receipts?.length > 0}
                      <button
                        class="p-2 rounded-lg text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors"
                        on:click={() => retryUpload(upload)}
                        disabled={retryingUploads.has(upload.id)}
                        aria-label="Retry failed receipts"
                        title="Retry failed receipts"
                      >
                        <RotateCw class="{retryingUploads.has(upload.id) ? 'w-5 h-5 animate-spin' : 'w-5 h-5'}" />
                      </button>
                    {/if}
                    <button
                      class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      on:click={() => receiptQueue.removeUpload(upload.id)}
                      aria-label="Remove"
                    >
                      <X class="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

    </div>
  </div>
</div>
