<script lang="ts">
  import { onMount } from 'svelte';
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import { apiClient } from '$lib/api/client';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import { CheckCircle, AlertCircle, XCircle, Loader2, Image as ImageIcon, ZoomIn, RotateCw } from 'lucide-svelte';
  
  let selectedUpload: any = null;
  let selectedUploadDetails: any = null;
  let loadingDetails = false;
  let imageUrls: Map<string, string> = new Map();
  let selectedImageModal: string | null = null;
  let reprocessing = false;
  let showDebug = false;

  function extractFilename(urlOrFilename: string | null | undefined): string | null {
    if (!urlOrFilename) {
      console.warn('⚠️ extractFilename received empty value:', urlOrFilename);
      return null;
    }
    
    // If it's already just a filename (no slashes), return it
    if (!urlOrFilename.includes('/')) {
      return urlOrFilename;
    }
    
    // Extract filename from URL path like "/files/abc123.jpg" or "http://example.com/files/abc123.jpg"
    const parts = urlOrFilename.split('/');
    const filename = parts[parts.length - 1];
    
    console.log('📝 Extracted filename:', filename, 'from:', urlOrFilename);
    return filename || null;
  }

  async function loadImageUrl(filename: string | null): Promise<string> {
    if (!filename) {
      console.error('❌ loadImageUrl called with empty filename');
      return '';
    }
    
    if (imageUrls.has(filename)) {
      return imageUrls.get(filename)!;
    }
    
    try {
      console.log('🔄 Loading image:', filename);
      const url = await apiClient.getImageUrl(filename);
      console.log('✅ Image loaded successfully:', filename);
      imageUrls = new Map(imageUrls).set(filename, url);
      return url;
    } catch (err) {
      console.error('❌ Failed to load image:', filename, err);
      return '';
    }
  }

  async function selectUpload(upload: any) {
    selectedUpload = upload;
    selectedUploadDetails = null;
    loadingDetails = true;

    try {
      console.log('📤 Fetching upload details for uploadId:', upload.uploadId);
      const details = await apiClient.getUpload(upload.uploadId);
      console.log('📥 Received upload details:', details);
      
      selectedUploadDetails = details;
      
      // Preload images
      if (details.images?.marked) {
        console.log('🖼️ Loading marked image:', details.images.marked);
        const markedFilename = extractFilename(details.images.marked);
        if (markedFilename) {
          loadImageUrl(markedFilename);
        }
      } else {
        console.warn('⚠️ No marked image found in response');
      }
      
      if (details.images?.splitReceipts) {
        console.log('🖼️ Loading', details.images.splitReceipts.length, 'split receipt images');
        details.images.splitReceipts.forEach((url: string) => {
          const filename = extractFilename(url);
          if (filename) {
            loadImageUrl(filename);
          }
        });
      } else {
        console.warn('⚠️ No split receipts found in response');
      }
    } catch (err) {
      console.error('❌ Failed to load upload details:', err);
      alert(`Failed to load upload details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      loadingDetails = false;
    }
  }

  function formatCurrency(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') {
      console.warn('⚠️ formatCurrency received invalid amount:', amount);
      return '$0.00';
    }
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num)) {
      console.error('❌ formatCurrency: NaN result from amount:', amount);
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  function getStatusBadge(receipt: any) {
    if (receipt.status === 'success' || receipt.storeName) {
      return { text: 'Success', color: 'bg-green-100 text-green-800' };
    } else if (receipt.status === 'processing') {
      return { text: 'Processing', color: 'bg-blue-100 text-blue-800' };
    } else if (receipt.error) {
      return { text: 'Possible Issues', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'Failed', color: 'bg-red-100 text-red-800' };
    }
  }

  async function retryProcessing(uploadId: number) {
    if (reprocessing) return;
    
    reprocessing = true;
    try {
      await apiClient.reprocessReceipt(uploadId);
      
      // Wait a moment and then reload the details
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload the upload details to show new status
      if (selectedUpload && selectedUpload.uploadId === uploadId) {
        await selectUpload(selectedUpload);
      }
      
      alert('Reprocessing started. Please check back in a few moments.');
    } catch (err: any) {
      console.error('Failed to reprocess receipt:', err);
      alert(err.message || 'Failed to start reprocessing');
    } finally {
      reprocessing = false;
    }
  }

  function closeModal() {
    selectedImageModal = null;
  }

  $: sortedUploads = [...$receiptQueue.completedUploads].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
  );
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/20">
  <div class="container mx-auto px-4 py-12">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold tracking-tight">Receipt History</h1>
          <p class="text-muted-foreground text-lg mt-2">View and manage all your processed receipts</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          on:click={() => showDebug = !showDebug}
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left Sidebar: Upload List -->
      <div class="lg:col-span-1">
        <div class="sticky top-6">
          <h2 class="text-lg font-semibold mb-4">Recent Uploads</h2>
          
          {#if sortedUploads.length === 0}
            <div class="text-center py-12 px-4 rounded-2xl bg-card/50 backdrop-blur-sm">
              <div class="inline-flex p-4 rounded-full bg-muted mb-4">
                <ImageIcon class="w-8 h-8 text-muted-foreground" />
              </div>
              <p class="font-medium">No uploads yet</p>
              <p class="text-sm text-muted-foreground mt-1">Upload some receipts to get started</p>
            </div>
          {:else}
            <div class="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {#each sortedUploads as upload (upload.uploadId)}
                <button
                  class="w-full text-left p-4 rounded-xl transition-all {selectedUpload?.uploadId === upload.uploadId
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-sm'}"
                  on:click={() => selectUpload(upload)}
                >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{upload.fileName}</p>
                    <p class="text-xs text-muted-foreground">
                      {formatDate(upload.completedAt)}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold">{upload.statistics.totalDetected}</p>
                    <p class="text-xs text-muted-foreground">receipt{upload.statistics.totalDetected !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                
                <div class="mt-3 flex items-center gap-2 text-xs">
                  {#if upload.statistics.successful > 0}
                    <span class="flex items-center gap-1 text-green-600">
                      <CheckCircle class="w-3 h-3" />
                      {upload.statistics.successful}
                    </span>
                  {/if}
                  {#if upload.statistics.failed > 0}
                    <span class="flex items-center gap-1 text-destructive">
                      <XCircle class="w-3 h-3" />
                      {upload.statistics.failed}
                    </span>
                  {/if}
                  {#if upload.statistics.processing > 0}
                    <span class="flex items-center gap-1 text-blue-600">
                      <Loader2 class="w-3 h-3 animate-spin" />
                      {upload.statistics.processing}
                    </span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

      <!-- Right Content: Upload Details -->
      <div class="lg:col-span-2">
        {#if !selectedUpload}
          <div class="flex items-center justify-center h-[600px] rounded-2xl bg-card/50 backdrop-blur-sm">
            <div class="text-center">
              <div class="inline-flex p-6 rounded-full bg-muted mb-4">
                <ImageIcon class="w-12 h-12 text-muted-foreground" />
              </div>
              <p class="text-xl font-medium">Select an upload to view details</p>
              <p class="text-muted-foreground mt-2">Click on any upload from the list</p>
            </div>
          </div>
        {:else if loadingDetails}
          <div class="flex items-center justify-center h-[600px] rounded-2xl bg-card/50 backdrop-blur-sm">
            <div class="text-center">
              <Loader2 class="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p class="text-muted-foreground">Loading receipt details...</p>
            </div>
          </div>
        {:else if selectedUploadDetails}
          <div class="space-y-6">
            
            <!-- Debug Panel -->
            {#if showDebug}
              <div class="rounded-2xl bg-yellow-50 border-2 border-yellow-200 p-6 shadow-sm">
                <h3 class="font-bold text-lg mb-4">🐛 Debug Information</h3>
                <div class="space-y-2 text-sm">
                  <div>
                    <strong>Upload ID:</strong> {selectedUploadDetails.uploadId || 'N/A'}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedUploadDetails.status || 'N/A'}
                  </div>
                  <div>
                    <strong>Has Images Object:</strong> {selectedUploadDetails.images ? 'YES' : 'NO'}
                  </div>
                  <div>
                    <strong>Marked Image URL:</strong> {selectedUploadDetails.images?.marked || 'MISSING'}
                  </div>
                  <div>
                    <strong>Split Receipts Count:</strong> {selectedUploadDetails.images?.splitReceipts?.length || 0}
                  </div>
                  <div>
                    <strong>Receipts in Response:</strong> {selectedUploadDetails.receipts?.all?.length || 0}
                  </div>
                  <details class="mt-4">
                    <summary class="cursor-pointer font-bold">Full API Response</summary>
                    <pre class="mt-2 p-3 bg-white rounded overflow-auto max-h-96 text-xs">{JSON.stringify(selectedUploadDetails, null, 2)}</pre>
                  </details>
                </div>
              </div>
            {/if}
            
            <!-- Header with Stats -->
            <div class="rounded-2xl bg-card/50 backdrop-blur-sm p-6 shadow-sm">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold">{selectedUpload.fileName}</h2>
                {#if selectedUploadDetails.statistics.failed > 0}
                  <Button
                    variant="outline"
                    size="sm"
                    on:click={() => retryProcessing(selectedUpload.uploadId)}
                    disabled={reprocessing}
                  >
                    {#if reprocessing}
                      <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                      Reprocessing...
                    {:else}
                      <RotateCw class="w-4 h-4 mr-2" />
                      Retry Failed
                    {/if}
                  </Button>
                {/if}
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                  <div class="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-slate-200/50"></div>
                  <div class="relative">
                    <p class="text-xs font-medium text-muted-foreground mb-1">Detected</p>
                    <p class="text-3xl font-bold text-slate-700">{selectedUploadDetails.statistics.totalDetected}</p>
                  </div>
                </div>
                
                <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4">
                  <div class="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-green-200/50"></div>
                  <div class="relative">
                    <p class="text-xs font-medium text-green-700 mb-1">Success</p>
                    <p class="text-3xl font-bold text-green-600">{selectedUploadDetails.statistics.successful}</p>
                  </div>
                </div>
                
                <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 p-4">
                  <div class="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-yellow-200/50"></div>
                  <div class="relative">
                    <p class="text-xs font-medium text-yellow-700 mb-1">With Issues</p>
                    <p class="text-3xl font-bold text-yellow-600">
                      {selectedUploadDetails.receipts.all.filter((r: any) => r.error && r.storeName).length}
                    </p>
                  </div>
                </div>
                
                <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-4">
                  <div class="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-red-200/50"></div>
                  <div class="relative">
                    <p class="text-xs font-medium text-red-700 mb-1">Failed</p>
                    <p class="text-3xl font-bold text-red-600">{selectedUploadDetails.statistics.failed}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Marked Image (Detection Rectangles) -->
            {#if selectedUploadDetails.images.marked}
              {@const markedFilename = extractFilename(selectedUploadDetails.images.marked)}
              <div class="rounded-2xl bg-card/50 backdrop-blur-sm p-6 shadow-sm">
                <div class="flex items-center gap-2 mb-4">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <ImageIcon class="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 class="font-semibold">Detection Preview</h3>
                    <p class="text-sm text-muted-foreground">Red rectangles show detected receipt boundaries</p>
                  </div>
                </div>
                {#if markedFilename}
                  {#await loadImageUrl(markedFilename)}
                    <div class="bg-muted/50 rounded-xl h-64 flex items-center justify-center">
                      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  {:then url}
                    {#if url}
                      <button
                        class="relative group cursor-zoom-in w-full"
                        on:click={() => selectedImageModal = url}
                      >
                        <img
                          src={url}
                          alt="Marked receipt"
                          class="w-full rounded-xl shadow-sm"
                        />
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-xl flex items-center justify-center">
                          <div class="p-3 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn class="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </button>
                    {:else}
                      <div class="bg-red-50 rounded-xl p-4 text-center text-red-600">
                        <XCircle class="w-8 h-8 mx-auto mb-2" />
                        <p class="text-sm">Failed to load marked image</p>
                      </div>
                    {/if}
                  {/await}
                {:else}
                  <div class="bg-yellow-50 rounded-xl p-4 text-center text-yellow-600">
                    <AlertCircle class="w-8 h-8 mx-auto mb-2" />
                    <p class="text-sm">No marked image filename found</p>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Individual Receipts -->
            <div>
              <h2 class="text-2xl font-bold mb-4">Individual Receipts</h2>
              <div class="grid gap-4">
                {#each selectedUploadDetails.receipts.all as receipt, index (receipt.id)}
                  {@const badge = getStatusBadge(receipt)}
                  {@const filename = extractFilename(receipt.imageUrl)}
                  {#if showDebug}
                    <!-- Debug: Log receipt data -->
                    {console.log(`🧾 Receipt #${receipt.id}:`, {
                      storeName: receipt.storeName,
                      totalAmount: receipt.totalAmount,
                      totalAmountType: typeof receipt.totalAmount,
                      taxAmount: receipt.taxAmount,
                      imageUrl: receipt.imageUrl,
                      filename: filename,
                      hasLineItems: !!receipt.lineItems,
                      lineItemsCount: receipt.lineItems?.length || 0,
                      status: receipt.status,
                      error: receipt.error
                    })}
                  {/if}
                  <div class="rounded-2xl bg-card shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start gap-6">
                      <!-- Receipt Image -->
                      {#if receipt.imageUrl && filename}
                        {#await loadImageUrl(filename)}
                          <div class="w-32 h-40 bg-muted/50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        {:then url}
                          {#if url}
                            <button
                              class="relative group cursor-zoom-in flex-shrink-0"
                              on:click={() => selectedImageModal = url}
                            >
                              <img
                                src={url}
                                alt="Receipt {index + 1}"
                                class="w-32 h-40 object-cover rounded-xl shadow-sm"
                              />
                              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
                                <div class="p-2 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn class="w-5 h-5 text-white" />
                                </div>
                              </div>
                            </button>
                          {:else}
                            <div class="w-32 h-40 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                              <div class="text-center">
                                <XCircle class="w-6 h-6 mx-auto mb-1 text-red-600" />
                                <p class="text-xs text-red-600">Failed</p>
                              </div>
                            </div>
                          {/if}
                        {/await}
                      {:else if receipt.imageUrl}
                        <div class="w-32 h-40 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <div class="text-center">
                            <AlertCircle class="w-6 h-6 mx-auto mb-1 text-yellow-600" />
                            <p class="text-xs text-yellow-600">No image</p>
                          </div>
                        </div>
                      {:else}
                        <div class="w-32 h-40 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <ImageIcon class="w-8 h-8 text-gray-400" />
                        </div>
                      {/if}

                      <!-- Receipt Data -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h4 class="font-semibold text-lg">
                              {receipt.storeName || 'Unknown Merchant'}
                            </h4>
                            <p class="text-sm text-muted-foreground">
                              Receipt #{receipt.id}
                            </p>
                          </div>
                          <div class="text-right">
                            <span class="px-3 py-1.5 text-xs font-semibold rounded-full {badge.color}">
                              {badge.text}
                            </span>
                          </div>
                        </div>

                      {#if receipt.totalAmount}
                        <div class="mb-3">
                          <p class="text-2xl font-bold">{formatCurrency(receipt.totalAmount)}</p>
                          {#if receipt.taxAmount}
                            <p class="text-sm text-muted-foreground">
                              Tax: {formatCurrency(receipt.taxAmount)}
                            </p>
                          {/if}
                          {#if receipt.transactionDate}
                            <p class="text-sm text-muted-foreground">
                              {new Date(receipt.transactionDate).toLocaleDateString()}
                            </p>
                          {/if}
                        </div>
                      {/if}

                      {#if receipt.lineItems && receipt.lineItems.length > 0}
                        <div class="mt-3 border-t pt-3">
                          <p class="text-sm font-medium mb-2">Items ({receipt.lineItems.length})</p>
                          <div class="space-y-1 max-h-40 overflow-y-auto">
                            {#each receipt.lineItems as item}
                              {@const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price}
                              {@const itemQuantity = item.quantity || 1}
                              {@const itemTotal = !isNaN(itemPrice) ? itemPrice * itemQuantity : 0}
                              <div class="flex justify-between text-sm">
                                <span class="text-muted-foreground">
                                  {item.description || 'Unknown item'}
                                  {itemQuantity > 1 ? `(x${itemQuantity})` : ''}
                                </span>
                                <span class="font-medium">{formatCurrency(itemTotal)}</span>
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}

                        {#if receipt.error}
                          <div class="mt-3 px-3 py-2 bg-yellow-50 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
                            <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{receipt.error}</span>
                          </div>
                        {/if}

                        {#if !receipt.storeName && !receipt.totalAmount}
                          <div class="mt-3 px-3 py-2 bg-red-50 rounded-lg text-sm text-destructive flex items-start gap-2">
                            <XCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>Failed to process this receipt</span>
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

          </div>
        {/if}
      </div>

    </div>
  </div>
</div>

<!-- Image Modal -->
{#if selectedImageModal}
  <div
    class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    on:click={closeModal}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="button"
    tabindex="0"
  >
    <div class="max-w-6xl max-h-full" on:click|stopPropagation on:keydown|stopPropagation role="presentation">
      <img
        src={selectedImageModal}
        alt="Full size"
        class="max-w-full max-h-[90vh] object-contain"
      />
    </div>
    <button
      class="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2"
      on:click={closeModal}
    >
      <X class="w-6 h-6" />
    </button>
  </div>
{/if}
