/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */
// src/App.jsx

import * as THREE from 'three';
import { useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Grid,
  Environment,
  useGLTF,
  Plane,
  OrbitControls,
} from '@react-three/drei';
import gsap from 'gsap';
import { createSeatMap } from './utils';

export default function App() {
  return (
    <Canvas shadows style={{ height: '100vh', width: '100vw' }}>
      <Scene />
    </Canvas>
  );
}

function Scene() {
  const { camera } = useThree();
  const [apiData, setApiData] = useState(null);
  const [seatMapData, setSeatMapData] = useState(null);
  const [screenDimensions, setScreenDimensions] = useState(null);
  const [view, setView] = useState('2d');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          'https://spdp.londontheatredirect.com/GetSeatingPlanScheme.ashx?locale=en-GB&performanceId=658847'
        );
        const data = await response.json();
        setApiData(data);
        camera.near = 0.1;
        camera.far = 3000;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      } catch (error) {
        console.error(error);
      }
    }
    fetchData();
  }, [camera]);

  useEffect(() => {
    if (apiData && camera) {
      const categoryMap = createSeatMap(apiData.Seats);
      setScreenDimensions(apiData.Shapes[0]);
      setSeatMapData(categoryMap);
    }
  }, [apiData, camera]);

  useEffect(() => {
    if (camera) {
      if (view === '2d') {
        camera.fov = 90;
        camera.position.set(-50, -100, 1000);
      } else {
        camera.fov = 60;
        camera.position.set(0, 100, 400);
      }
      camera.updateProjectionMatrix();
    }
  }, [view, camera]);

  useFrame(() => {
    if (screenDimensions && view !== '2d') {
      camera.lookAt(
        -screenDimensions.Y,
        screenDimensions.Height / 2,
        -screenDimensions.X
      );
    }
  });

  return (
    <group rotation={[view === '2d' ? Math.PI / 2 : 0, 0, 0]} positionY={-0.5}>
      <Ground />
      <ambientLight intensity={0.25} />
      <directionalLight
        castShadow
        intensity={2}
        position={[10, 6, -6]}
        shadow-mapSize={[1024, 1024]}
      >
        <orthographicCamera
          attach='shadow-camera'
          left={-20}
          right={20}
          top={20}
          bottom={-20}
        />
      </directionalLight>
      <Environment preset='dawn' />
      {apiData && screenDimensions && (
        <Screen
          args={[screenDimensions.Width, screenDimensions.Height]}
          x={-screenDimensions.Y}
          y={screenDimensions.Height / 2}
          z={-screenDimensions.X}
          rotation={[0, 0, 0]}
        />
      )}
      {apiData &&
        seatMapData &&
        Object.keys(seatMapData).map((item, index) => (
          <RenderSection
            key={index}
            theatreDimensions={{ height: apiData.Width, width: apiData.Height }}
            setView={setView}
            seatMapData={seatMapData}
            sectionName={item}
            sectionElevation={
              (Object.keys(seatMapData).length - 1 - index) * 50
            }
            setPosition={(x, y, z) => {
              gsap.to(camera.position, {
                x: () => -x,
                y: () => z + 10,
                z: () => -y,
                duration: 1,
              });
            }}
          />
        ))}
      {view !== '2d' && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          rotateSpeed={4}
          panSpeed={2}
          screenSpacePanning={false}
        />
      )}
    </group>
  );
}

const Screen = (props) => (
  <Plane position={[props.x, props.y, props.z]} {...props}>
    <meshBasicMaterial
      attach='material'
      color={'white'}
      side={THREE.DoubleSide}
    />
  </Plane>
);

function Ground() {
  const gridConfig = {
    cellSize: 50,
    cellThickness: 0.5,
    cellColor: '#6f6f6f',
    sectionSize: 300,
    sectionThickness: 1,
    sectionColor: '#9d4b4b',
    fadeDistance: 1000,
    fadeStrength: 1,
    followCamera: false,
    infiniteGrid: true,
  };
  return <Grid position={[0, 0, 0]} args={[1000, 1000]} {...gridConfig} />;
}

const Model = ({
  seatColor,
  x,
  y,
  size = 15,
  setPosition,
  sectionElevation,
  setView,
}) => {
  const gltf = useGLTF('/seat.glb');
  const modelScene = useMemo(() => {
    const clone = gltf.scene.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material.color.set(seatColor);
      }
    });
    return clone;
  }, [gltf.scene, seatColor]);

  const handleOnClick = () => {
    setPosition(x, y, sectionElevation + 5);
    setView('3d');
  };

  return (
    <primitive
      rotation={[0, Math.PI, 0]}
      onClick={handleOnClick}
      color={seatColor}
      object={modelScene}
      position={[x, sectionElevation + 5, y]}
      scale={size}
    />
  );
};

const RenderRow = ({
  seatMapData,
  section,
  row,
  theatreDimensions,
  setPosition,
  sectionElevation,
  setView,
}) => {
  const seats = seatMapData[section][row];
  return seats.map((seat, index) => (
    <Model
      key={index}
      setView={setView}
      seatColor='grey'
      rotation={[0, Math.PI, 0]}
      y={theatreDimensions.height / 2 - seat.Y}
      x={theatreDimensions.width / 2 - seat.X}
      setPosition={setPosition}
      sectionElevation={sectionElevation}
    />
  ));
};

const RenderSection = ({
  seatMapData,
  sectionName,
  theatreDimensions,
  sectionElevation,
  setPosition,
  setView,
}) => {
  const sectionData = seatMapData[sectionName];
  return (
    <group rotation={[0, Math.PI, 0]}>
      {Object.keys(sectionData).map((row, index) => (
        <RenderRow
          key={index}
          seatMapData={seatMapData}
          section={sectionName}
          row={row}
          setView={setView}
          theatreDimensions={theatreDimensions}
          setPosition={setPosition}
          sectionElevation={sectionElevation}
          zOffset={index}
        />
      ))}
    </group>
  );
};
