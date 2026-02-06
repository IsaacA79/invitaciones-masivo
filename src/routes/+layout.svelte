<script>
  import "../app.css";
  
  const props = $props();
  const children = $derived.by(() => props.children);
</script>

{@render children?.()}
