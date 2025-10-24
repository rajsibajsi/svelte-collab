<script lang="ts">
import "../app.css";

// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
const { children } = $props();
</script>

{@render children()}
