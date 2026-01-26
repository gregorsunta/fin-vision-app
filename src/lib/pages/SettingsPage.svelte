<script lang="ts">
  import DeleteUserData from '$lib/components/DeleteUserData.svelte';
  import Card from '$lib/components/Card.svelte';
</script>

<div class="p-4 sm:p-6 lg:p-8">
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

    <Card>
      <h2 class="text-xl font-semibold mb-2">Account Management</h2>
      <p class="mb-4 text-gray-600">
        Here you can manage your account settings. Be careful, as some actions are irreversible.
      </p>
      <DeleteUserData />
    </Card>

    <!-- Other settings can be added here in the future -->
  </div>
</div>
