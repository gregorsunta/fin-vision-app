<script lang="ts">
  import { cn } from '$lib/utils/cn';
  
  let className = '';
  export { className as class };
  export let variant: 'default' | 'ghost' | 'outlined' = 'default';

  const variants = {
    default: 'bg-card shadow-sm',
    ghost: 'bg-transparent',
    outlined: 'bg-card border border-border',
  };
</script>

<div
  class={cn(
    'rounded-xl text-card-foreground',
    variants[variant],
    className
  )}
  {...$$restProps}
>
  <slot />
</div>
