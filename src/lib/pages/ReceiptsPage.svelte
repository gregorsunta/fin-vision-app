<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import { apiClient } from '$lib/api/client';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import { CheckCircle, AlertCircle, XCircle, Loader2, Image as ImageIcon, ZoomIn, RotateCw, X, AlertTriangle, ChevronDown } from 'lucide-svelte';
  
  let selectedUpload: any = null;
  let selectedUploadDetails: any = null;
  let loadingDetails = false;
  let imageUrls: Map<string, string> = new Map();
  let selectedImageModal: string | null = null;
  let reprocessing = false;
  let reprocessingReceipts = new Set<number>();
  let showDebug = false;
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let expandedReceiptId: number | null = null;

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
    expandedReceiptId = null;
    loadingDetails = true;

    try {
      console.log('📤 Fetching upload details for uploadId:', upload.uploadId);
      const details = await apiClient.getUpload(upload.uploadId);
      console.log('📥 Received upload details:', details);
      
      // Deep log receipts structure
      if (details.receipts) {
        console.log('📋 Receipts structure:', {
          hasAll: !!details.receipts.all,
          allCount: details.receipts.all?.length || 0,
          hasSuccessful: !!details.receipts.successful,
          successfulCount: details.receipts.successful?.length || 0
        });
        
        if (details.receipts.all && details.receipts.all.length > 0) {
          const firstReceipt = details.receipts.all[0];
          console.log('🧾 FIRST RECEIPT RAW DATA:', firstReceipt);
          console.log('💰 Price fields check:', {
            totalAmount: firstReceipt.totalAmount,
            totalAmountType: typeof firstReceipt.totalAmount,
            total: firstReceipt.total,
            totalType: typeof firstReceipt.total,
            currency: firstReceipt.currency,
            currencyType: typeof firstReceipt.currency,
            allKeys: Object.keys(firstReceipt)
          });
          
          if (firstReceipt.lineItems && firstReceipt.lineItems.length > 0) {
            const firstItem = firstReceipt.lineItems[0];
            console.log('📦 FIRST LINE ITEM RAW DATA:', firstItem);
            console.log('💵 Line item price fields:', {
              totalPrice: firstItem.totalPrice,
              totalPriceType: typeof firstItem.totalPrice,
              amount: firstItem.amount,
              amountType: typeof firstItem.amount,
              unit: firstItem.unit,
              unitType: typeof firstItem.unit,
              pricePerUnit: firstItem.pricePerUnit,
              allKeys: Object.keys(firstItem)
            });
          }
        }
      }
      
      selectedUploadDetails = details;

      // Sync sidebar stats with fresh API data
      if (details.statistics) {
        receiptQueue.updateUploadStatistics(upload.uploadId, details.statistics);
      }

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
      startPollingIfProcessing();
    } catch (err) {
      console.error('❌ Failed to load upload details:', err);
      alert(`Failed to load upload details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      loadingDetails = false;
    }
  }

  function formatCurrency(amount: string | number | null | undefined, currency: string = 'USD'): string {
    if (amount === null || amount === undefined || amount === '') {
      console.warn('⚠️ formatCurrency received invalid amount:', amount);
      return formatZero(currency);
    }
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num)) {
      console.error('❌ formatCurrency: NaN result from amount:', amount, 'currency:', currency);
      return formatZero(currency);
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(num);
    } catch (err) {
      console.error('❌ formatCurrency: Invalid currency code:', currency, err);
      // Fallback to USD if currency code is invalid
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(num);
    }
  }

  function formatZero(currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(0);
    } catch (err) {
      return '$0.00';
    }
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

  function getStatusBadge(receipt: any, hasWarnings: boolean = false) {
    if (receipt.status === 'pending') {
      return { text: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Loader2 };
    } else if (receipt.status === 'processed' || receipt.storeName) {
      if (hasWarnings) {
        return { text: 'Needs Review', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
      }
      return { text: 'Success', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else if (receipt.status === 'unreadable') {
      return { text: 'Unreadable', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
    } else if (receipt.status === 'failed') {
      return { text: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle };
    } else {
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
  }

  function getValidationWarningsForReceipt(receiptId: number): any[] {
    if (!selectedUploadDetails?.errors) return [];
    
    return selectedUploadDetails.errors.filter((error: any) => 
      error.receiptId === receiptId && 
      error.category === 'VALIDATION_WARNING'
    );
  }

  function formatPriceMismatchWarning(warning: any): string {
    const metadata = warning.metadata || {};
    const details = metadata.details || {};
    
    if (details.calculatedSubtotal && details.receiptSubtotal && details.difference) {
      return `Sum of item prices (${formatCurrency(details.calculatedSubtotal, 'EUR')}) differs from receipt total by ${formatCurrency(Math.abs(parseFloat(details.difference)), 'EUR')}`;
    }
    
    return warning.message || 'Price validation warning';
  }

  async function retryProcessing(uploadId: number) {
    if (reprocessing) return;

    reprocessing = true;
    try {
      const result = await apiClient.reprocessReceipt(uploadId);
      console.log('Reprocess result:', result);

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (selectedUpload && selectedUpload.uploadId === uploadId) {
        await selectUpload(selectedUpload);
      }
    } catch (err: any) {
      console.error('Failed to reprocess:', err);
      alert(err.message || 'Failed to start reprocessing');
    } finally {
      reprocessing = false;
    }
  }

  async function retrySingleReceipt(uploadId: number, receiptId: number) {
    if (reprocessingReceipts.has(receiptId)) return;

    reprocessingReceipts.add(receiptId);
    reprocessingReceipts = reprocessingReceipts;

    try {
      const result = await apiClient.reprocessSingleReceipt(uploadId, receiptId);
      console.log('Single receipt reprocess result:', result);

      await new Promise(resolve => setTimeout(resolve, 2000));

      if (selectedUpload && selectedUpload.uploadId === uploadId) {
        await selectUpload(selectedUpload);
      }
    } catch (err: any) {
      console.error('Failed to reprocess receipt:', err);
      alert(err.message || 'Failed to start reprocessing');
    } finally {
      reprocessingReceipts.delete(receiptId);
      reprocessingReceipts = reprocessingReceipts;
    }
  }

  function startPollingIfProcessing() {
    stopPolling();
    if (selectedUploadDetails?.status === 'processing') {
      // Don't poll if the upload looks stuck (>5 min old with no receipts)
      const updatedAt = new Date(selectedUploadDetails.updatedAt);
      const isStuck = (Date.now() - updatedAt.getTime()) > 5 * 60 * 1000
        && selectedUploadDetails.statistics.totalDetected === 0;
      if (isStuck) return;

      pollingInterval = setInterval(async () => {
        if (selectedUpload) {
          try {
            const details = await apiClient.getUpload(selectedUpload.uploadId);
            selectedUploadDetails = details;

            if (details.statistics) {
              receiptQueue.updateUploadStatistics(selectedUpload.uploadId, details.statistics);
            }

            if (details.images?.marked) {
              const markedFilename = extractFilename(details.images.marked);
              if (markedFilename) loadImageUrl(markedFilename);
            }
            if (details.images?.splitReceipts) {
              details.images.splitReceipts.forEach((url: string) => {
                const filename = extractFilename(url);
                if (filename) loadImageUrl(filename);
              });
            }

            if (details.status !== 'processing') {
              stopPolling();
            }
          } catch (err) {
            console.error('Polling error:', err);
          }
        }
      }, 3000);
    }
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  function closeModal() {
    selectedImageModal = null;
  }

  onDestroy(() => {
    stopPolling();
  });

  $: sortedUploads = [...$receiptQueue.completedUploads].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
  );

  $: sortedReceipts = selectedUploadDetails?.receipts?.all
    ? [...selectedUploadDetails.receipts.all].sort((a: any, b: any) => {
        const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
        const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      })
    : [];

  function toggleReceiptExpand(receiptId: number) {
    expandedReceiptId = expandedReceiptId === receiptId ? null : receiptId;
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/20">
  <div class="container mx-auto px-4 py-12">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold tracking-tight">Uploads</h1>
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
          
          {#if sortedUploads.length === 0}
            <div class="text-center py-12 px-4 rounded-xl bg-card/50">
              <div class="inline-flex p-4 rounded-full bg-muted mb-4">
                <ImageIcon class="w-8 h-8 text-muted-foreground" />
              </div>
              <p class="font-medium">No uploads yet</p>
              <p class="text-sm text-muted-foreground mt-1">Upload some receipts to get started</p>
            </div>
          {:else}
            <div class="space-y-0.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {#each sortedUploads as upload (upload.uploadId)}
                {@const isSelected = selectedUpload?.uploadId === upload.uploadId}
                {@const stats = upload.statistics}
                <button
                  class="w-full text-left px-3 py-2.5 rounded-lg transition-colors {isSelected
                    ? 'bg-muted'
                    : 'hover:bg-muted/50'}"
                  on:click={() => selectUpload(upload)}
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium truncate flex-1 min-w-0">{upload.fileName}</p>
                    <p class="text-xs text-muted-foreground whitespace-nowrap">{formatDate(upload.completedAt)}</p>
                  </div>
                  <div class="flex items-center gap-3 mt-1">
                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                      {stats.totalDetected}
                    </span>
                    {#if stats.processing > 0}
                      <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                        {stats.processing}
                      </span>
                    {/if}
                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <span class="w-2 h-2 rounded-full bg-green-500"></span>
                      {stats.successful}
                    </span>
                    {#if stats.failed > 0}
                      <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        {stats.failed}
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
          <div class="flex items-center justify-center h-[600px] rounded-xl bg-card/50">
            <div class="text-center">
              <div class="inline-flex p-6 rounded-full bg-muted mb-4">
                <ImageIcon class="w-12 h-12 text-muted-foreground" />
              </div>
              <p class="text-xl font-medium">Select an upload to view details</p>
              <p class="text-muted-foreground mt-2">Click on any upload from the list</p>
            </div>
          </div>
        {:else if loadingDetails}
          <div class="flex items-center justify-center h-[600px] rounded-xl bg-card/50">
            <div class="text-center">
              <Loader2 class="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p class="text-muted-foreground">Loading receipt details...</p>
            </div>
          </div>
        {:else if selectedUploadDetails}
          <div class="space-y-6">
            
            <!-- Debug Panel -->
            {#if showDebug}
              <div class="rounded-xl bg-yellow-50/80 p-6">
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
            
            <!-- Processing Status Banner -->
            {#if selectedUploadDetails.status === 'processing'}
              {@const updatedAt = new Date(selectedUploadDetails.updatedAt)}
              {@const isStuck = (Date.now() - updatedAt.getTime()) > 5 * 60 * 1000 && selectedUploadDetails.statistics.totalDetected === 0}
              {#if isStuck}
                <div class="rounded-xl bg-yellow-50/80 p-5">
                  <div class="flex items-center gap-3">
                    <AlertTriangle class="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div class="flex-1">
                      <h3 class="font-semibold text-yellow-900">Processing appears stuck</h3>
                      <p class="text-sm text-yellow-700 mt-1">This upload has been processing since {updatedAt.toLocaleString()} with no results. The background job may have failed. Try "Redo All" to reprocess.</p>
                    </div>
                  </div>
                </div>
              {:else}
                <div class="rounded-xl bg-blue-50/80 p-5">
                  <div class="flex items-center gap-3">
                    <Loader2 class="w-6 h-6 animate-spin text-blue-600 flex-shrink-0" />
                    <div class="flex-1">
                      <h3 class="font-semibold text-blue-900">Processing in progress</h3>
                      <p class="text-sm text-blue-700 mt-1">{selectedUploadDetails.message}</p>
                      {#if selectedUploadDetails.statistics.totalDetected > 0}
                        <div class="mt-3 w-full bg-blue-200 rounded-full h-2">
                          <div
                            class="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style="width: {Math.round(((selectedUploadDetails.statistics.successful + selectedUploadDetails.statistics.failed) / selectedUploadDetails.statistics.totalDetected) * 100)}%"
                          ></div>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              {/if}
            {/if}

            <!-- Slim Header -->
            <div class="flex items-center justify-between rounded-xl bg-card/50 px-6 py-4">
              <div class="flex items-center gap-3 min-w-0">
                <h2 class="text-lg font-semibold truncate">{selectedUpload.fileName}</h2>
                {#if selectedUploadDetails.status === 'completed'}
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium flex-shrink-0">
                    <CheckCircle class="w-3.5 h-3.5" />
                    Completed
                  </span>
                {:else if selectedUploadDetails.status === 'processing'}
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex-shrink-0">
                    <Loader2 class="w-3.5 h-3.5 animate-spin" />
                    Processing
                  </span>
                {:else if selectedUploadDetails.status === 'partly_completed'}
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium flex-shrink-0">
                    <AlertTriangle class="w-3.5 h-3.5" />
                    Partly Completed
                  </span>
                {:else if selectedUploadDetails.status === 'failed'}
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium flex-shrink-0">
                    <XCircle class="w-3.5 h-3.5" />
                    Failed
                  </span>
                {/if}
              </div>
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
                  Redo All
                {/if}
              </Button>
            </div>

            <!-- Individual Receipts -->
            <div class="rounded-xl bg-card/50 overflow-hidden">
              <div class="px-6 py-4">
                <h2 class="text-lg font-semibold">Individual Receipts</h2>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th class="px-4 py-3 text-left w-10">#</th>
                      <th class="px-4 py-3 text-left w-16">Status</th>
                      <th class="px-4 py-3 text-left">Store</th>
                      <th class="px-4 py-3 text-right">Total</th>
                      <th class="px-4 py-3 text-left">Date</th>
                      <th class="px-4 py-3 text-right w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each sortedReceipts as receipt, index (receipt.id)}
                      {@const warnings = getValidationWarningsForReceipt(receipt.id)}
                      {@const hasWarnings = warnings.length > 0}
                      {@const badge = getStatusBadge(receipt, hasWarnings)}
                      {@const filename = extractFilename(receipt.imageUrl)}
                      {@const isExpanded = expandedReceiptId === receipt.id}
                      <!-- Summary Row -->
                      <tr
                        class="hover:bg-muted/20 cursor-pointer transition-colors {isExpanded ? 'bg-muted/20' : ''}"
                        on:click={() => toggleReceiptExpand(receipt.id)}
                      >
                        <td class="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center gap-1.5 group/status relative" title={badge.text}>
                            {#if receipt.status === 'pending'}
                              <Loader2 class="w-4 h-4 animate-spin text-blue-500" />
                            {:else if badge.text === 'Success'}
                              <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                            {:else if badge.text === 'Needs Review'}
                              <AlertTriangle class="w-4 h-4 text-orange-500" />
                            {:else if badge.text === 'Unreadable'}
                              <span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                            {:else if badge.text === 'Failed'}
                              <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                            {:else}
                              <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                            {/if}
                            <span class="hidden group-hover/status:inline text-xs text-muted-foreground">{badge.text}</span>
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span class="text-sm font-medium truncate block max-w-[200px]">
                            {receipt.storeName || (receipt.status === 'pending' ? 'Analyzing...' : 'Unknown Merchant')}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <span class="text-sm font-semibold">
                            {#if receipt.totalAmount}
                              {formatCurrency(receipt.totalAmount, receipt.currency)}
                            {:else}
                              <span class="text-muted-foreground">—</span>
                            {/if}
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span class="text-sm text-muted-foreground">
                            {#if receipt.transactionDate}
                              {new Date(receipt.transactionDate).toLocaleDateString()}
                            {:else}
                              —
                            {/if}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <div class="flex items-center justify-end gap-1">
                              <button
                                class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                on:click|stopPropagation={() => retrySingleReceipt(selectedUpload.uploadId, receipt.id)}
                                disabled={reprocessingReceipts.has(receipt.id)}
                                aria-label="Retry this receipt"
                                title="Retry this receipt"
                              >
                                {#if reprocessingReceipts.has(receipt.id)}
                                  <Loader2 class="w-4 h-4 animate-spin" />
                                {:else}
                                  <RotateCw class="w-4 h-4" />
                                {/if}
                              </button>
                            <button
                              class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                              on:click|stopPropagation={() => toggleReceiptExpand(receipt.id)}
                              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                              title={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              <ChevronDown class="w-4 h-4 transition-transform duration-[250ms] {isExpanded ? 'rotate-180' : ''}" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      <!-- Expanded Detail Row -->
                      {#if isExpanded}
                        <tr class="bg-muted/10">
                          <td colspan="6" class="p-0">
                            <div transition:slide={{ duration: 250 }}>
                            <div class="px-6 py-5">
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
                                      on:click|stopPropagation={() => selectedImageModal = url}
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

                              <!-- Receipt Details -->
                              <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-2 mb-3">
                                  <div>
                                    <h4 class="font-semibold text-lg">
                                      {receipt.storeName || (receipt.status === 'pending' ? 'Analyzing...' : 'Unknown Merchant')}
                                    </h4>
                                    <p class="text-sm text-muted-foreground">
                                      Receipt #{receipt.id}
                                      {#if receipt.status === 'pending'}
                                        <span class="ml-2 inline-flex items-center gap-1 text-blue-600">
                                          <Loader2 class="w-3 h-3 animate-spin" />
                                          analyzing...
                                        </span>
                                      {/if}
                                    </p>
                                  </div>
                                  <span class="px-3 py-1.5 text-xs font-semibold rounded-full {badge.color}">
                                    {badge.text}
                                  </span>
                                </div>

                                {#if receipt.totalAmount}
                                  <div class="mb-3">
                                    <p class="text-2xl font-bold">{formatCurrency(receipt.totalAmount, receipt.currency)}</p>
                                    {#if receipt.taxAmount}
                                      <p class="text-sm text-muted-foreground">
                                        Tax: {formatCurrency(receipt.taxAmount, receipt.currency)}
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
                                  {@const products = receipt.lineItems.filter(i => !i.itemType || i.itemType === 'product')}
                                  {@const discounts = receipt.lineItems.filter(i => i.itemType === 'discount')}
                                  {@const otherItems = receipt.lineItems.filter(i => i.itemType && i.itemType !== 'product' && i.itemType !== 'discount')}

                                  <div class="mt-3 border-t border-border/20 pt-3">
                                    <p class="text-sm font-medium mb-2">Items ({receipt.lineItems.length})</p>
                                    <div class="space-y-1 max-h-40 overflow-y-auto">
                                      {#each products as item}
                                        {@const itemTotal = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : (item.totalPrice || 0)}
                                        {@const itemQuantity = typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 1)}
                                        {@const itemUnit = item.unit || ''}
                                        {@const itemUnitPrice = item.pricePerUnit ? parseFloat(item.pricePerUnit) : null}
                                        {@const shouldShowQuantity = itemQuantity > 1 && itemUnit !== 'g' && itemUnit !== 'ml'}
                                        <div class="flex justify-between text-sm">
                                          <span class="text-muted-foreground">
                                            {item.description || 'Unknown item'}
                                            {#if shouldShowQuantity && itemUnitPrice}
                                              <span class="text-xs ml-1">({itemQuantity} × {formatCurrency(itemUnitPrice, receipt.currency)})</span>
                                            {:else if shouldShowQuantity}
                                              <span class="text-xs ml-1">(×{itemQuantity}{itemUnit ? ' ' + itemUnit : ''})</span>
                                            {/if}
                                          </span>
                                          <span class="font-medium">{formatCurrency(itemTotal, receipt.currency)}</span>
                                        </div>
                                      {/each}

                                      {#each discounts as item}
                                        {@const itemTotal = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : (item.totalPrice || 0)}
                                        <div class="flex justify-between text-sm text-green-600 dark:text-green-400">
                                          <span class="flex items-center gap-1">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                            </svg>
                                            {item.description || 'Discount'}
                                            {#if item.discountMetadata?.type === 'percentage' && item.discountMetadata?.value}
                                              <span class="text-xs">({item.discountMetadata.value}%)</span>
                                            {:else if item.discountMetadata?.code}
                                              <span class="text-xs">({item.discountMetadata.code})</span>
                                            {/if}
                                          </span>
                                          <span class="font-medium">{formatCurrency(itemTotal, receipt.currency)}</span>
                                        </div>
                                      {/each}

                                      {#each otherItems as item}
                                        {@const itemTotal = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : (item.totalPrice || 0)}
                                        <div class="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                                          <span class="flex items-center gap-1">
                                            <span class="text-xs uppercase bg-blue-100 dark:bg-blue-900 px-1 rounded">{item.itemType}</span>
                                            {item.description || 'Other'}
                                          </span>
                                          <span class="font-medium">{formatCurrency(itemTotal, receipt.currency)}</span>
                                        </div>
                                      {/each}
                                    </div>
                                  </div>
                                {/if}

                                {#if hasWarnings}
                                  <div class="mt-3 space-y-2">
                                    {#each warnings as warning}
                                      <div class="px-3 py-2 bg-orange-50/80 rounded-lg text-sm">
                                        <div class="flex items-start gap-2">
                                          <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-600" />
                                          <div class="flex-1">
                                            <p class="font-medium text-orange-900">Validation Warning</p>
                                            <p class="text-orange-800 mt-1">{formatPriceMismatchWarning(warning)}</p>
                                            {#if warning.metadata?.details?.items}
                                              <details class="mt-2">
                                                <summary class="cursor-pointer text-xs text-orange-700 hover:text-orange-900">
                                                  View item breakdown
                                                </summary>
                                                <div class="mt-2 space-y-1 text-xs bg-white/50 p-2 rounded">
                                                  {#each warning.metadata.details.items as item}
                                                    <div class="flex justify-between">
                                                      <span>{item.description}</span>
                                                      <span class="font-medium">{formatCurrency(item.lineTotal, receipt.currency)}</span>
                                                    </div>
                                                  {/each}
                                                  <div class="border-t border-orange-200 pt-1 mt-1 flex justify-between font-medium">
                                                    <span>Calculated:</span>
                                                    <span>{formatCurrency(warning.metadata.details.calculatedSubtotal, receipt.currency)}</span>
                                                  </div>
                                                  <div class="flex justify-between font-medium">
                                                    <span>Receipt total:</span>
                                                    <span>{formatCurrency(warning.metadata.details.receiptSubtotal, receipt.currency)}</span>
                                                  </div>
                                                  <div class="flex justify-between font-bold text-orange-900">
                                                    <span>Difference:</span>
                                                    <span>{formatCurrency(Math.abs(parseFloat(warning.metadata.details.difference)), receipt.currency)}</span>
                                                  </div>
                                                </div>
                                              </details>
                                            {/if}
                                          </div>
                                        </div>
                                      </div>
                                    {/each}
                                  </div>
                                {/if}

                                {#if receipt.error}
                                  <div class="mt-3 px-3 py-2 bg-yellow-50 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
                                    <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{receipt.error}</span>
                                  </div>
                                {/if}

                                {#if !receipt.storeName && !receipt.totalAmount && receipt.status !== 'pending'}
                                  <div class="mt-3 px-3 py-2 bg-red-50 rounded-lg text-sm text-destructive flex items-start gap-2">
                                    <XCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>Failed to process this receipt</span>
                                  </div>
                                {/if}
                              </div>
                            </div>
                            </div>
                            <div class="border-b border-border/40"></div>
                            </div>
                          </td>
                        </tr>
                      {/if}

                      <!-- Row separator -->
                      {#if !isExpanded}
                        <tr aria-hidden="true"><td colspan="6" class="p-0 border-b border-border/40"></td></tr>
                      {/if}
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Detection Preview & Split Images -->
            {#if selectedUploadDetails.images.marked || (selectedUploadDetails.images.splitReceipts && selectedUploadDetails.images.splitReceipts.length > 0)}
              <div class="rounded-xl bg-card/50 p-6">
                <div class="flex items-center gap-2 mb-4">
                  <div class="p-2 rounded-lg bg-primary/10">
                    <ImageIcon class="w-5 h-5 text-primary" />
                  </div>
                  <h3 class="font-semibold">Images</h3>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {#if selectedUploadDetails.images.marked}
                    {@const markedFilename = extractFilename(selectedUploadDetails.images.marked)}
                    {#if markedFilename}
                      {#await loadImageUrl(markedFilename)}
                        <div class="bg-muted/50 rounded-lg h-40 flex items-center justify-center">
                          <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      {:then url}
                        {#if url}
                          <button
                            class="relative group cursor-zoom-in"
                            on:click={() => selectedImageModal = url}
                          >
                            <img
                              src={url}
                              alt="Detection preview"
                              class="w-full h-40 object-cover rounded-lg"
                            />
                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                              <div class="p-2 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn class="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded">
                              Detection
                            </div>
                          </button>
                        {:else}
                          <div class="bg-red-50 rounded-lg h-40 flex items-center justify-center">
                            <XCircle class="w-5 h-5 text-red-600" />
                          </div>
                        {/if}
                      {/await}
                    {/if}
                  {/if}

                  {#if selectedUploadDetails.images.splitReceipts}
                    {#each selectedUploadDetails.images.splitReceipts as splitReceiptUrl, index}
                      {@const filename = extractFilename(splitReceiptUrl)}
                      {#if filename}
                        {#await loadImageUrl(filename)}
                          <div class="bg-muted/50 rounded-lg h-40 flex items-center justify-center">
                            <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        {:then url}
                          {#if url}
                            <button
                              class="relative group cursor-zoom-in"
                              on:click={() => selectedImageModal = url}
                            >
                              <img
                                src={url}
                                alt="Split receipt {index + 1}"
                                class="w-full h-40 object-cover rounded-lg"
                              />
                              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                <div class="p-2 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn class="w-4 h-4 text-white" />
                                </div>
                              </div>
                              <div class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded">
                                Receipt {index + 1}
                              </div>
                            </button>
                          {:else}
                            <div class="bg-red-50 rounded-lg h-40 flex items-center justify-center">
                              <XCircle class="w-5 h-5 text-red-600" />
                            </div>
                          {/if}
                        {/await}
                      {/if}
                    {/each}
                  {/if}
                </div>
              </div>
            {/if}

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
