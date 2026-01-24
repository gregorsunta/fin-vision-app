<script lang="ts">
  import { apiClient, ApiError } from '$lib/api/client';
  import { authStore } from '$lib/stores/auth';
  import { receiptQueue } from '$lib/stores/receiptQueue';
  import Button from './Button.svelte';
  import Input from './Input.svelte';
  import Label from './Label.svelte';
  import Card from './Card.svelte';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleSubmit() {
    error = '';
    loading = true;

    try {
      const response = await apiClient.login(email, password);
      authStore.login(response.accessToken, email);
      
      // Fetch completed uploads from API (with localStorage fallback)
      await receiptQueue.fetchCompletedUploads();
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('auth-success'));
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
      } else {
        error = 'An unexpected error occurred';
      }
    } finally {
      loading = false;
    }
  }
</script>

<Card class="w-full max-w-md p-6">
  <div class="mb-6">
    <h2 class="text-2xl font-bold text-center">Welcome Back</h2>
    <p class="text-muted-foreground text-center mt-2">Sign in to your account</p>
  </div>

  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    {#if error}
      <div class="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
        {error}
      </div>
    {/if}

    <div class="space-y-2">
      <Label for_="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        bind:value={email}
        disabled={loading}
        required
      />
    </div>

    <div class="space-y-2">
      <Label for_="password">Password</Label>
      <Input
        id="password"
        type="password"
        placeholder="••••••••"
        bind:value={password}
        disabled={loading}
        required
      />
    </div>

    <Button type="submit" class="w-full" disabled={loading}>
      {loading ? 'Signing In...' : 'Sign In'}
    </Button>
  </form>

  <div class="mt-4 text-center text-sm">
    Don't have an account?
    <button
      type="button"
      class="text-primary hover:underline font-medium"
      on:click={() => window.dispatchEvent(new CustomEvent('switch-to-register'))}
    >
      Sign up
    </button>
  </div>
</Card>
