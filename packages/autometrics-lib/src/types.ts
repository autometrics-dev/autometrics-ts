export type Objective = {
  name: string;
  success_rate?: ObjectivePercentile;
  latency?: [ObjectiveLatency, ObjectivePercentile];
};

export enum ObjectivePercentile {
  P90 = "90",
  P95 = "95",
  P99 = "99",
  P99_9 = "99.9",
}

export enum ObjectiveLatency {
  Ms5 = "0.005",
  Ms10 = "0.01",
  Ms25 = "0.025",
  Ms50 = "0.05",
  Ms75 = "0.075",
  Ms100 = "0.1",
  Ms250 = "0.25",
  Ms500 = "0.5",
  Ms750 = "0.75",
  Ms1000 = "1",
  Ms2500 = "2.5",
  Ms5000 = "5",
  Ms7500 = "7.5",
  Ms10000 = "10",
}
