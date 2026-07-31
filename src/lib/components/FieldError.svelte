<script lang="ts">
	import { AlertCircle } from '@lucide/svelte';

	interface Props {
		message: string;
	}

	let { message }: Props = $props();
</script>

<p class="text-critical-600 mt-1 flex items-center gap-1 text-xs font-medium" role="alert">
	<AlertCircle class="size-3.5 shrink-0" />
	{message}
</p>
