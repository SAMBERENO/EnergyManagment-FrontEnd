export interface GenerationMix {
    fuel: string;
    perc: number;
}

export interface AvgWithCleanEnergy {
    from: string;
    to: string;
    generationmix: GenerationMix[];
    cleanenergy: number; //
}

export interface OptimalChargingWindow {
    startTime: string;
    endTime: string;
    cleanEnergyPercentage: number;
}
