import {
  CAMERA_DESKTOP_FOV,
  CAMERA_DESKTOP_POSITION,
  CAMERA_MOBILE_ASPECT,
  CAMERA_MOBILE_FOV,
  CAMERA_MOBILE_POSITION,
} from './constants';
import { VectorTuple } from './diceMath';

export type DiceCameraLayout = {
  position: VectorTuple;
  fov: number;
};

export function getDiceCameraLayout(
  width: number,
  height: number,
): DiceCameraLayout {
  const isMobile = height > 0 && width / height < CAMERA_MOBILE_ASPECT;
  return isMobile
    ? { position: [...CAMERA_MOBILE_POSITION], fov: CAMERA_MOBILE_FOV }
    : { position: [...CAMERA_DESKTOP_POSITION], fov: CAMERA_DESKTOP_FOV };
}
