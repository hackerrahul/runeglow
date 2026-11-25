<script lang="ts">
  let { children } = $props();
</script>

{@render children()}

<style>
  :global(body) {
    margin: 0;
    background: #121212;
    color: #eee;
    font-family: system-ui, sans-serif;
  }
  :global(a) {
    color: #9cf;
  }
</style>
