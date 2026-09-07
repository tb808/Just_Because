export interface AssetDefinition { path: string; height: number; animated?: boolean }
export const assets = {
  characters: {
    player: { path: 'assets/characters/nika.glb', height: 1.8, animated: true },
  },
  vehicles: { car: { path: 'assets/vehicles/car.glb', height: 1.65 } },
  environment: {
    palm: { path: 'assets/vegetation/palm.glb', height: 10 },
    tree: { path: 'assets/vegetation/tree.glb', height: 8 },
    rock: { path: 'assets/environment/rock.glb', height: 3.4 },
    house: { path: 'assets/buildings/house.glb', height: 7 },
    warehouse: { path: 'assets/buildings/warehouse.glb', height: 10 },
    tank: { path: 'assets/props/tank.glb', height: 5 },
    container: { path: 'assets/props/container.glb', height: 3 },
  },
} satisfies Record<string, Record<string, AssetDefinition>>;
