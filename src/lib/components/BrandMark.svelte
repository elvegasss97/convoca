<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className = 'size-8' }: Props = $props();
</script>

<svg viewBox="0 0 256 256" class={className} aria-hidden="true">
	<path
		d="M 194.69 197.06 A 96 96 0 1 1 194.69 58.94"
		fill="none"
		stroke="#FF7101"
		stroke-width="34"
	/>
	<path d="M 182.88 184.83 L 206.50 209.29 L 142.88 230.83 Z" fill="#FF7101" />
	<path
		d="M 160.92 173.30 A 56 56 0 1 1 160.92 82.70"
		fill="none"
		stroke="#016548"
		stroke-width="22"
		stroke-linecap="round"
	/>
	<path
		d="M 148.57 156.32 A 35 35 0 1 1 148.57 99.68"
		fill="none"
		stroke="#016548"
		stroke-width="19"
		stroke-linecap="round"
	/>
	<path
		d="M 137.40 140.94 A 16 16 0 1 1 137.40 115.06"
		fill="none"
		stroke="#FF7101"
		stroke-width="14"
		stroke-linecap="round"
	/>
</svg>
