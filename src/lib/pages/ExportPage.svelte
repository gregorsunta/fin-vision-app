<script lang="ts">
  import { apiClient, ApiError } from '$lib/api/client';
  import Button from '$lib/components/Button.svelte';
  import { Download, ShoppingCart, Receipt, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-svelte';

  type ExportType = 'items' | 'receipts' | 'uploads';

  interface ExportState {
    loading: boolean;
    success: boolean;
    error: string;
  }

  let states: Record<ExportType, ExportState> = {
    items: { loading: false, success: false, error: '' },
    receipts: { loading: false, success: false, error: '' },
    uploads: { loading: false, success: false, error: '' },
  };

  const exports: { type: ExportType; icon: any; title: string; description: string; filename: string }[] = [
    {
      type: 'items',
      icon: ShoppingCart,
      title: 'Items',
      description: 'All line items with receipt context — store, price, quantity, and more.',
      filename: 'fin-vision-items',
    },
    {
      type: 'receipts',
      icon: Receipt,
      title: 'Receipts',
      description: 'Receipt summaries — store, total, tax, currency, and date.',
      filename: 'fin-vision-receipts',
    },
    {
      type: 'uploads',
      icon: Upload,
      title: 'Uploads',
      description: 'Upload metadata and processing statistics.',
      filename: 'fin-vision-uploads',
    },
  ];

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleExport(type: ExportType) {
    states[type] = { loading: true, success: false, error: '' };

    try {
      let blob: Blob;
      const entry = exports.find(e => e.type === type)!;

      if (type === 'items') {
        blob = await apiClient.downloadItemsCSV();
      } else if (type === 'receipts') {
        blob = await apiClient.downloadCSV();
      } else {
        blob = await apiClient.downloadUploadsCSV();
      }

      triggerDownload(blob, entry.filename);
      states[type] = { loading: false, success: true, error: '' };

      setTimeout(() => {
        states[type].success = false;
        states = states;
      }, 5000);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Export failed';
      states[type] = { loading: false, success: false, error: message };
    }
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/20">
  <div class="container mx-auto px-4 py-12">
    <div class="max-w-3xl mx-auto space-y-6">

      <div class="text-center space-y-2 mb-4">
        <h1 class="text-4xl font-bold tracking-tight">Export Your Data</h1>
        <p class="text-muted-foreground text-lg">
          Download your data as CSV for Excel, Google Sheets, or accounting software.
        </p>
      </div>

      {#each exports as { type, icon, title, description }}
        {@const state = states[type]}
        <div class="rounded-2xl bg-card shadow-sm p-6 flex items-center gap-6">
          <div class="flex-shrink-0 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
            <svelte:component this={icon} class="w-8 h-8 text-primary" />
          </div>

          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-semibold">{title}</h2>
            <p class="text-sm text-muted-foreground mt-0.5">{description}</p>

            {#if state.success}
              <div class="flex items-center gap-2 mt-2 text-sm text-green-600">
                <CheckCircle class="w-4 h-4" />
                <span>Downloaded successfully</span>
              </div>
            {/if}

            {#if state.error}
              <div class="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle class="w-4 h-4" />
                <span>{state.error}</span>
              </div>
            {/if}
          </div>

          <div class="flex-shrink-0">
            <Button
              on:click={() => handleExport(type)}
              disabled={state.loading}
              variant="outline"
              size="sm"
            >
              {#if state.loading}
                <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              {:else}
                <Download class="w-4 h-4 mr-2" />
                Download
              {/if}
            </Button>
          </div>
        </div>
      {/each}

    </div>
  </div>
</div>
