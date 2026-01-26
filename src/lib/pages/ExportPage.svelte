<script lang="ts">
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import { apiClient, ApiError } from '$lib/api/client';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import { Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-svelte';
  
  let exporting = false;
  let exportError = '';
  let exportSuccess = false;
  let lastExportDate: Date | null = null;

  async function handleExportCSV() {
    exportError = '';
    exportSuccess = false;
    exporting = true;

    try {
      const blob = await apiClient.downloadCSV();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fin-vision-receipts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      exportSuccess = true;
      lastExportDate = new Date();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        exportSuccess = false;
      }, 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        exportError = err.message;
      } else {
        exportError = 'Failed to export receipts';
      }
    } finally {
      exporting = false;
    }
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  $: totalReceipts = $receiptQueue.completedUploads.reduce(
    (sum, upload) => sum + upload.statistics.successful,
    0
  );
  $: totalUploads = $receiptQueue.completedUploads.length;
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/20">
  <div class="container mx-auto px-4 py-12">
    <div class="max-w-4xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold tracking-tight">Export Your Data</h1>
        <p class="text-muted-foreground text-lg">
          Download all your receipts and line items for Excel, Google Sheets, or accounting software
        </p>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 transition-all hover:shadow-lg">
          <div class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-indigo-200/50"></div>
          <div class="relative">
            <div class="inline-flex p-3 rounded-xl bg-indigo-500/10 mb-4">
              <FileSpreadsheet class="w-8 h-8 text-indigo-600" />
            </div>
            <p class="text-4xl font-bold text-indigo-900 mb-1">{totalReceipts}</p>
            <p class="text-sm font-medium text-indigo-700">Total Receipts</p>
          </div>
        </div>

        <div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-8 transition-all hover:shadow-lg">
          <div class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-blue-200/50"></div>
          <div class="relative">
            <div class="inline-flex p-3 rounded-xl bg-blue-500/10 mb-4">
              <Download class="w-8 h-8 text-blue-600" />
            </div>
            <p class="text-4xl font-bold text-blue-900 mb-1">{totalUploads}</p>
            <p class="text-sm font-medium text-blue-700">Total Uploads</p>
          </div>
        </div>

        <div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-green-100 p-8 transition-all hover:shadow-lg">
          <div class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-green-200/50"></div>
          <div class="relative">
            <div class="inline-flex p-3 rounded-xl bg-green-500/10 mb-4">
              <CheckCircle class="w-8 h-8 text-green-600" />
            </div>
            <p class="text-4xl font-bold text-green-900 mb-1">
              {$receiptQueue.completedUploads.reduce((sum, u) => sum + u.statistics.successful, 0)}
            </p>
            <p class="text-sm font-medium text-green-700">Successful</p>
          </div>
        </div>
      </div>

      <!-- Export Section -->
      <div class="rounded-2xl bg-card shadow-sm p-8">
        <div class="flex items-start gap-8">
          <div class="flex-shrink-0">
            <div class="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl">
              <FileSpreadsheet class="w-16 h-16 text-primary" />
            </div>
          </div>
          
          <div class="flex-1">
            <h2 class="text-3xl font-bold mb-3">CSV Export</h2>
            <p class="text-muted-foreground text-lg mb-8">
              Export all your receipt data including merchant names, totals, taxes, dates, and individual line items.
              Perfect for accounting, expense tracking, and data analysis.
            </p>

            {#if exportSuccess}
              <div class="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl flex items-start gap-4 shadow-sm">
                <div class="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                  <CheckCircle class="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p class="font-semibold text-green-900 text-lg">Export successful!</p>
                  <p class="text-sm text-green-700 mt-1">
                    Your CSV file has been downloaded. Check your downloads folder.
                  </p>
                </div>
              </div>
            {/if}

            {#if exportError}
              <div class="mb-6 p-5 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl flex items-start gap-4 shadow-sm">
                <div class="flex-shrink-0 p-2 bg-red-100 rounded-lg">
                  <AlertCircle class="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p class="font-semibold text-destructive text-lg">Export failed</p>
                  <p class="text-sm text-destructive/80 mt-1">{exportError}</p>
                </div>
              </div>
            {/if}

            <div class="flex items-center gap-4">
              <Button
                on:click={handleExportCSV}
                disabled={exporting || totalReceipts === 0}
                size="lg"
                class="px-8"
              >
                {#if exporting}
                  <Loader2 class="w-5 h-5 mr-2 animate-spin" />
                  Exporting...
                {:else}
                  <Download class="w-5 h-5 mr-2" />
                  Download CSV
                {/if}
              </Button>
              
              {#if totalReceipts > 0 && !exporting}
                <span class="text-sm text-muted-foreground">
                  Ready to export {totalReceipts} receipt{totalReceipts === 1 ? '' : 's'}
                </span>
              {/if}
            </div>

          {#if totalReceipts === 0}
            <p class="text-sm text-muted-foreground mt-2">
              No receipts available to export. Upload some receipts first.
            </p>
          {:else if lastExportDate}
            <p class="text-sm text-muted-foreground mt-2">
              Last exported: {formatDate(lastExportDate)}
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- CSV Format Info -->
    <Card class="p-6">
      <h3 class="text-lg font-semibold mb-4">What's Included in the Export</h3>
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-medium mb-2">Receipt Information</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• Receipt ID</li>
            <li>• Upload ID</li>
            <li>• Merchant/Store Name</li>
            <li>• Total Amount</li>
            <li>• Tax Amount</li>
            <li>• Transaction Date</li>
            <li>• Processing Status</li>
            <li>• Keywords/Tags</li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-2">Line Items</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• Item Description</li>
            <li>• Quantity</li>
            <li>• Unit Price</li>
            <li>• Total Price</li>
            <li>• Item Keywords</li>
            <li>• Associated Receipt ID</li>
          </ul>
        </div>
      </div>
    </Card>

    <!-- Usage Tips -->
    <Card class="p-6">
      <h3 class="text-lg font-semibold mb-4">Tips for Using Your Export</h3>
      <div class="space-y-3 text-sm">
        <div class="flex gap-3">
          <span class="text-primary font-bold">1.</span>
          <div>
            <p class="font-medium">Open in Excel or Google Sheets</p>
            <p class="text-muted-foreground">
              The CSV format is compatible with all major spreadsheet applications.
            </p>
          </div>
        </div>
        <div class="flex gap-3">
          <span class="text-primary font-bold">2.</span>
          <div>
            <p class="font-medium">Create Pivot Tables</p>
            <p class="text-muted-foreground">
              Analyze spending by merchant, category, or time period using pivot tables.
            </p>
          </div>
        </div>
        <div class="flex gap-3">
          <span class="text-primary font-bold">3.</span>
          <div>
            <p class="font-medium">Import into Accounting Software</p>
            <p class="text-muted-foreground">
              Many accounting tools can import CSV files for expense tracking.
            </p>
          </div>
        </div>
        <div class="flex gap-3">
          <span class="text-primary font-bold">4.</span>
          <div>
            <p class="font-medium">Regular Exports</p>
            <p class="text-muted-foreground">
              Export regularly to maintain backups of your receipt data.
            </p>
          </div>
        </div>
      </div>
    </Card>

    <!-- Format Details -->
    <Card class="p-6 bg-muted">
      <h3 class="text-lg font-semibold mb-3">File Format Details</h3>
      <div class="space-y-2 text-sm">
        <p><span class="font-medium">Format:</span> CSV (Comma-Separated Values)</p>
        <p><span class="font-medium">Encoding:</span> UTF-8</p>
        <p><span class="font-medium">File Name:</span> fin-vision-receipts-YYYY-MM-DD.csv</p>
        <p><span class="font-medium">Compatibility:</span> Excel, Google Sheets, Numbers, LibreOffice</p>
      </div>
    </Card>

    </div>
  </div>
</div>
