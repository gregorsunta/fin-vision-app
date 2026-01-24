<script lang="ts">
  import { cn } from '$lib/utils/cn';

  export let for_: string | undefined = undefined;
  
  let className = '';
  export { className as class };
</script>

<label
  for={for_}
  class={cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    className
  )}
  {...$$restProps}
>
  <slot />
</label>
