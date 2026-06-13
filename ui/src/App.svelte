<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { RefreshCw, Eye, EyeOff, Wifi, CircleCheckBig } from "@lucide/svelte";
  import logo from "./assets/logo.svg";

  // Unsere externen Komponenten
  import Square12 from "$lib/components/loaders/square-12.svelte";
  import StatusScreen from "$lib/screens/StatusScreen.svelte";

  // Typ-Definition für ein Netzwerk
  type Network = { ssid: string; rssi: number; authmode: number };

  // States
  let networks = $state<Network[]>([]);
  let selectedSsid = $state("");
  let password = $state("");
  let showPassword = $state(false);

  // Lade- & Status-States
  let isScanning = $state(false);
  let isConnecting = $state(false);
  let view = $state<"setup" | "success" | "error">("setup");
  let errorMessage = $state("");
  let isClearDialogOpen = $state(false);
  let isClearing = $state(false);
  let clearStatus = $state<"idle" | "success" | "error">("idle");

  async function scanNetworks() {
    isScanning = true;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    try {
      let rawNetworks: Network[] = [];

      if (isLocalhost) {
        // Mock-Daten für PC-Test
        await new Promise((r) => setTimeout(r, 2000));
        rawNetworks = [
          { ssid: "JimKnopfs-Wlan", rssi: 4, authmode: 1 },
          { ssid: "EK-Palais", rssi: 2, authmode: 1 },
          { ssid: "FRITZ!Box 7690 PK", rssi: 3, authmode: 1 },
          { ssid: "Vodafone-1944", rssi: 1, authmode: 1 },
          { ssid: "JimKnopfs-Wlan", rssi: 1, authmode: 1 },
          { ssid: "WLAN-120634", rssi: 3, authmode: 0 },
        ];
      } else {
        // WICHTIG: Hier rufen wir jetzt exakt die Route deines C++ Backends auf!
        const res = await fetch("/update");
        const jsonBody = await res.json();

        rawNetworks = jsonBody.network || [];

        // jsonBody.show_code fangen wir hier zwar ab, aber da wir das Passwortfeld
        // in deinem Design eh immer anzeigen, brauchen wir damit aktuell nichts machen.
      }

      // 1. Duplikate mergen (nur das Stärkste behalten)
      const merged = new Map<string, Network>();
      for (const net of rawNetworks) {
        if (!merged.has(net.ssid) || merged.get(net.ssid)!.rssi < net.rssi) {
          merged.set(net.ssid, net);
        }
      }

      // 2. Sortieren (Level 4 zuerst, Level 0 zuletzt)
      networks = Array.from(merged.values()).sort((a, b) => b.rssi - a.rssi);

      if (networks.length > 0 && !selectedSsid) {
        selectedSsid = networks[0].ssid;
      }
    } catch (e) {
      console.error("Fehler beim Scannen", e);
    } finally {
      isScanning = false;
    }
  }

  // Initialer Scan beim Laden der Seite
  $effect(() => {
    scanNetworks();
  });

  async function handleConnect(event: Event) {
    event.preventDefault();
    if (!selectedSsid) return;

    isConnecting = true;
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    try {
      let data;
      if (isLocalhost) {
        await new Promise((r) => setTimeout(r, 2000));
        data =
          password === "1234"
            ? { success: true }
            : { success: false, reason: "Falsches Passwort" };
      } else {
        const response = await fetch("/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ssid: selectedSsid, password }),
        });
        data = await response.json();
      }

      if (data.success) {
        view = "success";
      } else {
        view = "error";
        errorMessage = data.reason;
      }
    } catch (e) {
      view = "error";
      errorMessage = "ESP32 nicht erreichbar.";
    } finally {
      isConnecting = false;
    }
  }

  async function handleClearNetworks(event: Event) {
    event.preventDefault();
    isClearing = true;
    clearStatus = "idle";

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    try {
      if (isLocalhost) {
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        const response = await fetch("/factoryreset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to reset the device.");
      }

      // 1. Status auf Success setzen (Grüner Haken erscheint)
      clearStatus = "success";

      // 2. Warte 1 Sekunde, wie du es wolltest
      setTimeout(() => {
        isClearDialogOpen = false; // Startet die Schließen-Animation

        // 3. Warte 300ms, bis die Dialog-Animation unsichtbar ist,
        // und setze erst DANN den Inhalt im Hintergrund zurück.
        setTimeout(() => {
          clearStatus = "idle";
        }, 300);
      }, 1000);
    } catch (error) {
      console.error(error);
      clearStatus = "error";
    } finally {
      isClearing = false;
    }
  }
</script>

<main
  class="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4 font-sans text-slate-900"
>
  <div class="flex flex-col items-center mb-6">
    <img src={logo} alt="DeskBuddy Logo" class="h-16 mb-12" />
    <h2 class="text-slate-500 font-medium">WLAN Setup</h2>
  </div>

  <Card.Root class="w-full max-w-md shadow-sm border-slate-200 bg-white">
    {#if view === "setup"}
      <Card.Content>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">Available Networks</h3>
          <button
            type="button"
            onclick={scanNetworks}
            disabled={isScanning}
            class="text-slate-400 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw class="w-5 h-5 {isScanning ? 'animate-spin' : ''}" />
          </button>
        </div>

        <form onsubmit={handleConnect} class="space-y-6">
          <div class="min-h-35 flex flex-col justify-center">
            {#if isScanning}
              <div
                class="flex items-center justify-center animate-in fade-in duration-300"
              >
                <div class="text-slate-500">
                  <Square12 size={45} dotSize={6} />
                </div>
              </div>
            {:else}
              <RadioGroup.Root
                bind:value={selectedSsid}
                class="space-y-4 animate-in fade-in duration-300"
              >
                {#each networks as network}
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <RadioGroup.Item value={network.ssid} id={network.ssid} />
                      <Label
                        for={network.ssid}
                        class="text-base font-normal cursor-pointer"
                      >
                        {network.ssid}
                      </Label>
                    </div>
                    <Wifi class="w-5 h-5 text-slate-700" />
                  </div>
                {/each}

                {#if networks.length === 0}
                  <p class="text-sm text-slate-500 text-center py-4">
                    Keine Netzwerke gefunden.
                  </p>
                {/if}
              </RadioGroup.Root>
            {/if}
          </div>

          <div class="h-px w-full bg-slate-100 my-4"></div>

          <div class="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              bind:value={password}
              class="pr-10 h-12"
              required
              disabled={isConnecting}
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onclick={() => (showPassword = !showPassword)}
            >
              {#if showPassword}
                <EyeOff class="w-5 h-5" />
              {:else}
                <Eye class="w-5 h-5" />
              {/if}
            </button>
          </div>

          <Button
            type="submit"
            class="w-full h-12 text-base font-medium bg-black hover:bg-slate-800"
            disabled={isConnecting || !selectedSsid}
          >
            {#if isConnecting}
              <Square12 class="mr-2 h-5 w-5 text-white" />
              Connecting...
            {:else}
              Connect
            {/if}
          </Button>
        </form>
      </Card.Content>
    {:else}
      <StatusScreen
        status={view === "success" ? "success" : "error"}
        {errorMessage}
        onRetry={() => {
          view = "setup";
          password = "";
        }}
      />
    {/if}
  </Card.Root>

  {#if view === "setup"}
    <div class="mt-6">
      <AlertDialog.Root bind:open={isClearDialogOpen}>
        <AlertDialog.Trigger
          class="text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          Clear Networks
        </AlertDialog.Trigger>

        <AlertDialog.Content>
          {#if clearStatus === "success"}
            <div
              class="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in duration-300"
            >
              <div class="bg-green-100 p-4 rounded-full mb-4">
                <CircleCheckBig class="w-10 h-10 text-green-600" />
              </div>
              <h2 class="text-xl font-bold text-slate-900 mb-2">
                Clear Success
              </h2>
              <p class="text-slate-500">Saved networks were cleared.</p>
            </div>
          {:else}
            <AlertDialog.Header>
              <AlertDialog.Title>Clear Networks?</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to remove all saved Wi-Fi networks from
                the device? This action cannot be undone.
              </AlertDialog.Description>
            </AlertDialog.Header>

            {#if clearStatus === "error"}
              <div class="text-sm text-red-500 bg-red-50 p-2 rounded-md mt-2">
                Failed to reset the device. Please try again.
              </div>
            {/if}

            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={isClearing}
                >Cancel</AlertDialog.Cancel
              >

              <Button
                variant="destructive"
                disabled={isClearing}
                onclick={handleClearNetworks}
              >
                {#if isClearing}
                  <Square12 size={16} dotSize={3} class="mr-2 text-white" />
                  Clearing...
                {:else}
                  Clear
                {/if}
              </Button>
            </AlertDialog.Footer>
          {/if}
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  {/if}
</main>
