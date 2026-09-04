import { MutableRefObject, RefObject, useCallback, useEffect, useRef } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  Group,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import {
  TableBounds,
  WorldTransform,
} from '../../../rpc/proto/dice/v1/dice_pb';
import {
  TableCameraTarget,
  TableCameraView,
  boundsForTransforms,
  fitTableView,
  panCamera,
  zoomAroundAnchor,
} from './cameraModel';
import { createCameraTouchTracker, TouchPoint } from './touchGesture';

export type CameraViewRequest = {
  version: number;
  kind: 'mine' | 'table';
};

export type DieTouchCoordinator = {
  start: (
    event: ThreeEvent<PointerEvent>,
    cancelDieDrag: () => void,
  ) => boolean;
  move: (event: ThreeEvent<PointerEvent>) => boolean;
  end: (event: ThreeEvent<PointerEvent>) => boolean;
};

type UseTableCameraOptions = {
  bounds: TableBounds;
  ownedTransforms: readonly WorldTransform[];
  resetKey: number;
  viewRequest: CameraViewRequest;
  worldGroup: RefObject<Group>;
};

function pointerCaptureTarget(event: ThreeEvent<PointerEvent>) {
  return event.target as unknown as {
    hasPointerCapture: (pointerId: number) => boolean;
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
  };
}

export function useTableCamera({
  bounds,
  ownedTransforms,
  resetKey,
  viewRequest,
  worldGroup,
}: UseTableCameraOptions) {
  const { camera, gl, size } = useThree();
  const initial = fitTableView(bounds, size.width / size.height);
  const view = useRef<TableCameraView>(initial);
  const destination = useRef<TableCameraView>(initial);
  const renderOrigin = useRef<TableCameraTarget>({ ...initial.target });
  const animation = useRef<{
    startedAt: number;
    from: TableCameraView;
    to: TableCameraView;
  }>();
  const mousePan = useRef<{
    pointerId: number;
    point: TableCameraTarget;
  }>();
  const touch = useRef(createCameraTouchTracker());
  const raycaster = useRef(new Raycaster());
  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const boundsRef = useRef(bounds);
  const ownedTransformsRef = useRef(ownedTransforms);
  const aspectRef = useRef(size.width / size.height);
  boundsRef.current = bounds;
  ownedTransformsRef.current = ownedTransforms;
  aspectRef.current = size.width / size.height;

  const maximumDistance = useCallback(() =>
    fitTableView(boundsRef.current, aspectRef.current).distance,
  []);

  const setImmediateView = useCallback((next: TableCameraView) => {
    animation.current = undefined;
    view.current = next;
    destination.current = next;
  }, []);

  const animateTo = useCallback((next: TableCameraView) => {
    destination.current = next;
    animation.current = {
      startedAt: performance.now(),
      from: { target: { ...view.current.target }, distance: view.current.distance },
      to: next,
    };
  }, []);

  const focusMine = useCallback(() => {
    const ownedBounds = boundsForTransforms(ownedTransformsRef.current);
    return fitTableView(
      ownedBounds ?? boundsRef.current,
      aspectRef.current,
    );
  }, []);

  useEffect(() => {
    if (resetKey > 0) animateTo(focusMine());
  }, [animateTo, focusMine, resetKey]);

  useEffect(() => {
    animateTo(viewRequest.kind === 'mine'
      ? focusMine()
      : fitTableView(boundsRef.current, aspectRef.current));
  }, [animateTo, focusMine, viewRequest.kind, viewRequest.version]);

  useFrame(() => {
    const activeAnimation = animation.current;
    if (activeAnimation) {
      const elapsed = (performance.now() - activeAnimation.startedAt) / 260;
      const alpha = Math.min(1, Math.max(0, elapsed));
      const eased = 1 - (1 - alpha) ** 3;
      view.current = {
        target: {
          x: activeAnimation.from.target.x +
            (activeAnimation.to.target.x - activeAnimation.from.target.x) * eased,
          z: activeAnimation.from.target.z +
            (activeAnimation.to.target.z - activeAnimation.from.target.z) * eased,
        },
        distance: activeAnimation.from.distance +
          (activeAnimation.to.distance - activeAnimation.from.distance) * eased,
      };
      if (alpha === 1) animation.current = undefined;
    }
    renderOrigin.current = { ...view.current.target };
    if (worldGroup.current) {
      worldGroup.current.position.set(
        -view.current.target.x,
        0,
        -view.current.target.z,
      );
    }
    if (camera instanceof PerspectiveCamera) {
      camera.fov = 42;
      camera.aspect = size.width / size.height;
      camera.near = 0.1;
      camera.far = 100_000;
      camera.position.set(
        0,
        view.current.distance * 0.8944271909999159,
        view.current.distance * 0.4472135954999579,
      );
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  });

  const renderPointForClient = useCallback((point: TouchPoint) => {
    const rect = gl.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      (point.x - rect.left) / rect.width * 2 - 1,
      -(point.y - rect.top) / rect.height * 2 + 1,
    );
    raycaster.current.setFromCamera(pointer, camera);
    const hit = raycaster.current.ray.intersectPlane(
      plane.current, new Vector3(),
    );
    return hit ? { x: hit.x, z: hit.z } : undefined;
  }, [camera, gl]);

  const applyTouchMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const update = touch.current.move(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (!update) return false;
    const previous = renderPointForClient(update.previousCentroid);
    const current = renderPointForClient(update.centroid);
    if (!previous || !current) return true;
    const panned = panCamera(view.current, {
      x: previous.x - current.x,
      z: previous.z - current.z,
    }, bounds);
    const anchor = {
      x: panned.target.x + current.x,
      z: panned.target.z + current.z,
    };
    setImmediateView(zoomAroundAnchor(
      panned,
      anchor,
      update.scale,
      maximumDistance(),
      bounds,
    ));
    return true;
  }, [bounds, maximumDistance, renderPointForClient, setImmediateView]);

  const dieTouch: DieTouchCoordinator = {
    start(event, cancelDieDrag) {
      if (event.pointerType !== 'touch') return false;
      return touch.current.start(
        event.pointerId,
        { x: event.clientX, y: event.clientY },
        'die',
        cancelDieDrag,
      );
    },
    move(event) {
      return event.pointerType === 'touch' && applyTouchMove(event);
    },
    end(event) {
      if (event.pointerType !== 'touch') return false;
      const wasActive = touch.current.isActive();
      touch.current.end(event.pointerId);
      return wasActive;
    },
  };

  const feltHandlers = {
    onPointerDown(event: ThreeEvent<PointerEvent>) {
      if (event.pointerType === 'touch') {
        touch.current.start(
          event.pointerId,
          { x: event.clientX, y: event.clientY },
          'felt',
        );
        pointerCaptureTarget(event).setPointerCapture(event.pointerId);
        return;
      }
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      event.stopPropagation();
      mousePan.current = {
        pointerId: event.pointerId,
        point: { x: event.point.x, z: event.point.z },
      };
      pointerCaptureTarget(event).setPointerCapture(event.pointerId);
    },
    onPointerMove(event: ThreeEvent<PointerEvent>) {
      if (event.pointerType === 'touch') {
        if (applyTouchMove(event)) event.stopPropagation();
        return;
      }
      const active = mousePan.current;
      if (!active || active.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const point = { x: event.point.x, z: event.point.z };
      setImmediateView(panCamera(view.current, {
        x: active.point.x - point.x,
        z: active.point.z - point.z,
      }, bounds));
      active.point = point;
    },
    onPointerUp(event: ThreeEvent<PointerEvent>) {
      if (event.pointerType === 'touch') touch.current.end(event.pointerId);
      if (mousePan.current?.pointerId === event.pointerId) {
        mousePan.current = undefined;
      }
      const target = pointerCaptureTarget(event);
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    },
    onPointerCancel(event: ThreeEvent<PointerEvent>) {
      touch.current.end(event.pointerId);
      if (mousePan.current?.pointerId === event.pointerId) {
        mousePan.current = undefined;
      }
    },
    onWheel(event: ThreeEvent<WheelEvent>) {
      event.stopPropagation();
      event.nativeEvent.preventDefault();
      const anchor = {
        x: view.current.target.x + event.point.x,
        z: view.current.target.z + event.point.z,
      };
      setImmediateView(zoomAroundAnchor(
        view.current,
        anchor,
        Math.exp(event.deltaY * 0.0015),
        maximumDistance(),
        bounds,
      ));
    },
  };

  return { renderOrigin, dieTouch, feltHandlers };
}

export type RenderOrigin = MutableRefObject<TableCameraTarget>;
