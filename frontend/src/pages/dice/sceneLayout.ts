import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import {
  CAMERA_DESKTOP_FOV,
  CAMERA_DESKTOP_POSITION,
  CAMERA_MOBILE_ASPECT,
  CAMERA_MOBILE_FOV,
  CAMERA_MOBILE_POSITION,
  TRAY_HALF_WIDTH,
  TRAY_WALL_THICKNESS,
} from './constants';
import { VectorTuple } from './diceMath';

export type DiceCameraLayout = {
  position: VectorTuple;
  fov: number;
};

export type TableBoundaryPoint = {
  x: number;
  z: number;
};

export type TableBoundary = readonly [
  TableBoundaryPoint,
  TableBoundaryPoint,
  TableBoundaryPoint,
  TableBoundaryPoint,
];

export function getDiceCameraLayout(
  width: number,
  height: number,
): DiceCameraLayout {
  const aspect = height > 0 ? width / height : 0;
  const isMobile = aspect > 0 && aspect < CAMERA_MOBILE_ASPECT;
  if (!isMobile) {
    return {
      position: [...CAMERA_DESKTOP_POSITION],
      fov: CAMERA_DESKTOP_FOV,
    };
  }

  const baseDistance = Math.hypot(...CAMERA_MOBILE_POSITION);
  const baseVerticalSpan = baseDistance * Math.tan(
    (CAMERA_MOBILE_FOV * Math.PI) / 360,
  );
  const requiredHorizontalSpan = (
    TRAY_HALF_WIDTH + TRAY_WALL_THICKNESS
  ) * 1.04;
  const scale = Math.max(
    1,
    requiredHorizontalSpan / (baseVerticalSpan * aspect),
  );

  return {
    position: CAMERA_MOBILE_POSITION.map(
      (coordinate) => coordinate * scale,
    ) as VectorTuple,
    fov: CAMERA_MOBILE_FOV,
  };
}

const SCREEN_CORNERS = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
] as const;

export function getTableBoundary(width: number, height: number): TableBoundary {
  if (width <= 0 || height <= 0) {
    throw new Error('The dice table viewport must have a positive size.');
  }

  const layout = getDiceCameraLayout(width, height);
  const camera = new PerspectiveCamera(layout.fov, width / height, 0.1, 100);
  camera.position.set(...layout.position);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const raycaster = new Raycaster();
  const ground = new Plane(new Vector3(0, 1, 0), 0);

  return SCREEN_CORNERS.map(([screenX, screenY]) => {
    raycaster.setFromCamera(new Vector2(screenX, screenY), camera);
    const hit = raycaster.ray.intersectPlane(ground, new Vector3());
    if (!hit) {
      throw new Error('The camera does not intersect the dice table.');
    }
    return { x: hit.x, z: hit.z };
  }) as unknown as TableBoundary;
}
