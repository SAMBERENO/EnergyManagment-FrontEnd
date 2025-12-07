<template>
  <div class="chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import {
  Chart,
  PieController,
  ArcElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions
} from "chart.js";

Chart.register(PieController, ArcElement, Tooltip, Legend);

type GenerationMix = {
  fuel: string;
  perc: number;
};

const props = defineProps<{
  fuelMix: GenerationMix[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart<"pie"> | null = null;

function buildChartData(fuelMix: GenerationMix[]): ChartData<"pie"> {
  return {
    labels: fuelMix.map(f => f.fuel),
    datasets: [
      {
        data: fuelMix.map(f => f.perc),
        backgroundColor: [
          "#4b9fff",
          "#ff6384",
          "#ffcd56",
          "#4bc0c0",
          "#9966ff",
          "#ff9f40",
          "#c9cbcf",
          "#36a2eb",
          "#ff9fa0",
        ]
      }
    ]
  };
}

const options: ChartOptions<"pie"> = {
  plugins: {
    legend: {
      position: "bottom"
    }
  },
  responsive: true,
  maintainAspectRatio: false
};

onMounted(() => {
  if (!canvasRef.value) return;

  chart = new Chart(canvasRef.value, {
    type: "pie",
    data: buildChartData(props.fuelMix),
    options
  });
});

watch(
    () => props.fuelMix,
    (newVal) => {
      if (chart) {
        chart.data = buildChartData(newVal);
        chart.update();
      }
    }
);
</script>

<style scoped>
.chart-container {
  width: 300px;
  height: 300px;
  margin: 0 auto;
  position: relative;
}
</style>
