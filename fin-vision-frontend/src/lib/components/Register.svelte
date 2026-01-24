<script lang="ts">
  import { apiClient, ApiError } from '$lib/api/client';
  import { authStore } from '$lib/stores/auth';
  import Button from './Button.svelte';
  import Input from './Input.svelte';
  import Label from './Label.svelte';
  import Card from './Card.svelte';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let validationErrors: Record<string, string[]> = {};

  async function handleSubmit() {
    error = '';
    validationErrors = {};
    
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    loading = true;

    try {
      const response = await apiClient.register(email, password);
      
      // After successful registration, log the user in
      const loginResponse = await apiClient.login(email, password);
      authStore.login(loginResponse.accessToken, email);
      
      // Dispatch success event
      window.dispatchEvent(new CustomEvent('auth-success'));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          validationErrors = err.details;
        } else {
          error = err.message;
        }
      } else {
        error = 'An unexpected error occurred';
      }
    } finally {
      loading = false;
    }
  }

  function getFieldError(field: string): string {
    return validationErrors[field]?.[0] || '';
  }
</script>

<Card class="w-full max-w-md p-6">
  <div class="mb-6">
    <h2 class="text-2xl font-bold text-center">Create Account</h2>
    <p class="text-muted-foreground text-center mt-2">Sign up to start managing your receipts</p>
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
      {#if getFieldError('email')}
        <p class="text-destructive text-sm">{getFieldError('email')}</p>
      {/if}
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
      {#if getFieldError('password')}
        <p class="text-destructive text-sm">{getFieldError('password')}</p>
      {/if}
      <p class="text-xs text-muted-foreground">
        Must be at least 8 characters with uppercase, lowercase, number, and special character
      </p>
    </div>

    <div class="space-y-2">
      <Label for_="confirmPassword">Confirm Password</Label>
      <Input
        id="confirmPassword"
        type="password"
        placeholder="••••••••"
        bind:value={confirmPassword}
        disabled={loading}
        required
      />
    </div>

    <Button type="submit" class="w-full" disabled={loading}>
      {loading ? 'Creating Account...' : 'Sign Up'}
    </Button>
  </form>

  <div class="mt-4 text-center text-sm">
    Already have an account?
    <button
      type="button"
      class="text-primary hover:underline font-medium"
      on:click={() => window.dispatchEvent(new CustomEvent('switch-to-login'))}
    >
      Sign in
    </button>
  </div>
</Card>
