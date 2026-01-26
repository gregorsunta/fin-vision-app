<script lang="ts">
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import { Upload, FileUp } from 'lucide-svelte';

  let fileInput: HTMLInputElement;
  let isDragging = false;
  let uploadedCount = 0;

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
    // Reset input
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function addFilesToQueue(files: File[]) {
    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select image files only');
      return;
    }

    if (imageFiles.length !== files.length) {
      alert(`${files.length - imageFiles.length} non-image file(s) were skipped`);
    }

    // Add all files to the queue
    receiptQueue.addMultipleUploads(imageFiles);
    uploadedCount += imageFiles.length;
  }
</script>

<Card class="p-6">
  <h3 class="text-xl font-semibold mb-4">Upload Receipts</h3>
  <p class="text-sm text-muted-foreground mb-4">
    Upload multiple receipts at once - they'll be processed asynchronously in the background
  </p>

  <div
    class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragging
      ? 'border-primary bg-primary/5'
      : 'border-border'}"
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    role="button"
    tabindex="0"
  >
    <div class="flex flex-col items-center gap-4">
      <Upload class="w-12 h-12 text-muted-foreground" />
      <div>
        <p class="text-lg font-medium">Drag and drop receipt images here</p>
        <p class="text-sm text-muted-foreground mt-1">or click to browse (multiple files supported)</p>
      </div>
      <Button
        type="button"
        on:click={() => fileInput.click()}
      >
        <FileUp class="w-4 h-4 mr-2" />
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

  {#if uploadedCount > 0}
    <div class="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
      {uploadedCount} receipt{uploadedCount === 1 ? '' : 's'} added to queue
    </div>
  {/if}
</Card>
