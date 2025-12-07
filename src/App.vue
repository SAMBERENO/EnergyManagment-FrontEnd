<script setup lang="ts">
import { onMounted, ref} from 'vue';
import EnergyChart from "./components/EnergyChart.vue";
import type {AvgWithCleanEnergy, OptimalChargingWindow} from "./types";

const API_BASE = 'https://energymanagment-backend.onrender.com/energy';

const days = ref<AvgWithCleanEnergy[]>([]);
const loadingMix = ref(false);
const errorMix = ref<string | null>(null);

const hoursInput = ref<number | null>(3);
const loadingCharging = ref(false);
const errorCharging = ref<string | null>(null);
const chargingResult = ref<OptimalChargingWindow | null>(null);

const CLEAN_FUELS = ['biomass', 'nuclear', 'hydro', 'wind', 'solar'];

function computeCleanEnergy(day: AvgWithCleanEnergy | undefined): number {
  if (!day) return 0;
  if (day.cleanenergy != null) {
    return day.cleanenergy;
  }
  return day.generationmix
      .filter(mix => CLEAN_FUELS.includes(mix.fuel))
      .reduce((acc, mix) => acc + (mix.perc || 0), 0);
}

function formatDateTimeRange(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);

  const optsDate: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  const optsTime: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  const fmtDate = new Intl.DateTimeFormat('pl-PL', optsDate);
  const fmtTime = new Intl.DateTimeFormat('pl-PL', optsTime);

  const dateFrom = fmtDate.format(from);
  const timeFrom = fmtTime.format(from);
  const dateTo = fmtDate.format(to);
  const timeTo = fmtTime.format(to);

  return `${dateFrom}, ${timeFrom} – ${dateTo}, ${timeTo}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const time = d.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${date}, ${time}`;
}

async function loadEnergyMix() {
  loadingMix.value = true;
  errorMix.value = null;

  try {
    const resp = await fetch(`${API_BASE}/each-day-avg`);
    if (!resp.ok) {
      throw new Error(`Błąd API: ${resp.status}`);
    }
    const data = (await resp.json()) as AvgWithCleanEnergy[];
    days.value = data;
  } catch (err) {
    console.error(err);
    errorMix.value = 'Nie udało się pobrać danych o miksie energetycznym.';
  } finally {
    loadingMix.value = false;
  }
}

async function calculateChargingWindow() {
  errorCharging.value = null;
  chargingResult.value = null;

  const hours = hoursInput.value;
  if (hours == null || hours < 1 || hours > 6) {
    errorCharging.value = 'Wprowadź liczbę godzin od 1 do 6.';
    return;
  }

  loadingCharging.value = true;

  try {
    const resp = await fetch(
        `${API_BASE}/optimal-charging-window?hours=${hours}`
    );
    if (!resp.ok) {
      throw new Error(`Błąd API: ${resp.status}`);
    }
    const data = (await resp.json()) as OptimalChargingWindow;
    chargingResult.value = data;
  } catch (err) {
    console.error(err);
    errorCharging.value = 'Nie udało się pobrać danych dla ładowania.';
  } finally {
    loadingCharging.value = false;
  }
}

onMounted(() => {
  loadEnergyMix();
});
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>Miks energetyczny – dziś, jutro, pojutrze</h1>
      <p v-if="errorMix" class="error-text">
        {{ errorMix }}
      </p>
    </header>

    <!-- Wykresy -->
    <section class="charts-section">
      <div class="chart-card" v-for="(day, idx) in days.slice(0, 3)" :key="idx">
        <h2 class="chart-title">
          {{ idx === 0 ? 'Dziś' : idx === 1 ? 'Jutro' : 'Pojutrze' }}
        </h2>
        <p class="chart-subtitle">
          {{ formatDateTimeRange(day.from, day.to) }}
        </p>
        <div class="chart-wrapper">
          <EnergyChart :fuelMix="day.generationmix" />
        </div>
        <p class="clean-energy">
          Czysta energia:
          <span>
            {{ computeCleanEnergy(day).toFixed(1) }}%
          </span>
        </p>
      </div>

      <div v-if="loadingMix" class="overlay">
        <div class="spinner"></div>
      </div>
    </section>

    <section class="charging-section">
      <div class="charging-card">
        <h2>Symulacja ładowania auta</h2>
        <p class="charging-desc">
          Podaj czas ładowania (1–6 godzin). Aplikacja wyśle zapytanie do backendu
          i policzy średni udział czystej energii w tym okresie.
        </p>

        <div class="form-row">
          <label for="hours" class="label">Czas ładowania (h)</label>
          <input
              id="hours"
              type="number"
              min="1"
              max="6"
              v-model.number="hoursInput"
              class="input"
          />
          <button class="btn" @click="calculateChargingWindow" :disabled="loadingCharging">
            {{ loadingCharging ? 'Obliczanie...' : 'Oblicz' }}
          </button>
        </div>

        <p v-if="errorCharging" class="error-text">
          {{ errorCharging }}
        </p>

        <div v-if="chargingResult" class="result">
          <p>
            <strong>Data i godzina rozpoczęcia:</strong>
            {{ formatDateTime(chargingResult.startTime) }}
          </p>
          <p>
            <strong>Data i godzina zakończenia:</strong>
            {{ formatDateTime(chargingResult.endTime) }}
          </p>
          <p>
            <strong>Średni procent udziału czystej energii:</strong>
            {{ chargingResult.cleanEnergyPercentage.toFixed(1) }}%
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #0b1220;
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
  sans-serif;
  padding: 2rem;
}

.header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.error-text {
  color: #f97373;
  margin-top: 0.5rem;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
  position: relative;
}

.chart-card {
  background: #111827;
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.chart-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.chart-subtitle {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

.chart-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 260px;
}

.clean-energy {
  text-align: center;
  font-size: 0.9rem;
  margin-top: 0.75rem;
}
.clean-energy span {
  color: #22c55e;
  font-weight: 600;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 1.5rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 3px solid #22c55e;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

.charging-section {
  margin-top: 2.5rem;
}

.charging-card {
  background: #111827;
  border-radius: 1.5rem;
  padding: 1.5rem;
  max-width: 800px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.charging-card h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.charging-desc {
  font-size: 0.9rem;
  color: #9ca3af;
  margin-bottom: 1.25rem;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.label {
  min-width: 130px;
  font-size: 0.9rem;
}

.input {
  width: 80px;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #374151;
  background: #020617;
  color: #e5e7eb;
}

.input:focus {
  outline: none;
  border-color: #22c55e;
}

.btn {
  padding: 0.5rem 1.5rem;
  border-radius: 999px;
  border: none;
  background: #22c55e;
  color: #022c22;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease,
  background-color 0.1s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
  background: #16a34a;
}

.result p {
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .page {
    padding: 1.25rem;
  }

  .form-row {
    align-items: flex-start;
  }

  .label {
    width: 100%;
  }
}
</style>
