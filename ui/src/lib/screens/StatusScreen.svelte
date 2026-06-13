<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { WifiOff, CheckCircle2 } from "@lucide/svelte";

  let { status, errorMessage, onRetry } = $props<{
    status: "success" | "error";
    errorMessage?: string;
    onRetry: () => void;
  }>();
</script>

<div
  class="flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300"
>
  {#if status === "success"}
    <div class="bg-green-100 p-4 rounded-full mb-4">
      <CheckCircle2 class="w-10 h-10 text-green-600" />
    </div>
    <h2 class="text-2xl font-bold text-slate-900 mb-2">Connected!</h2>
    <p class="text-slate-500 mb-6">
      DeskBuddy is successfully connected to the network. You can now close this
      window.
    </p>
  {:else if status === "error"}
    <div class="bg-red-100 p-4 rounded-full mb-4">
      <WifiOff class="w-10 h-10 text-red-600" />
    </div>
    <h2 class="text-2xl font-bold text-slate-900 mb-2">Connection Failed</h2>
    <p class="text-slate-500 mb-6 max-w-xs mx-auto">
      {errorMessage || "Could not establish a connection."}
    </p>
    <Button variant="outline" class="w-full" onclick={onRetry}>
      Try Again
    </Button>
  {/if}
</div>
