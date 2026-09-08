export interface AssetDefinition { path: string; height: number; animated?: boolean; tint?: string }
export const assets = {
  characters: {
    player: { path: 'assets/characters/nika.glb', height: 1.75, animated: true },
    soldier: { path: 'assets/characters/soldier.glb', height: 1.82, animated: true },
  },
  vehicles: { car: { path: 'assets/vehicles/car.glb', height: 2.15 } },
  weapons: {
    rifle: { path: 'assets/weapons/rifle.glb', height: 0.32 },
    launcher: { path: 'assets/weapons/launcher.glb', height: 0.48 },
  },
  environment: {
    palm: { path: 'assets/vegetation/palm.glb', height: 10 },
    tree: { path: 'assets/vegetation/tree.glb', height: 8 },
    rock: { path: 'assets/environment/rock.glb', height: 3.4 },
    house: { path: 'assets/buildings/house.glb', height: 11 },
    warehouse: { path: 'assets/buildings/warehouse.glb', height: 16 },
    tank: { path: 'assets/props/tank.glb', height: 6, tint: '#dc5742' },
    container: { path: 'assets/props/container.glb', height: 3 },
  },
} satisfies Record<string, Record<string, AssetDefinition>>;
