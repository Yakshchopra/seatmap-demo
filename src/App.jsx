/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
import * as THREE from 'three';
import { memo, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Grid,
  AccumulativeShadows,
  RandomizedLight,
  Environment,
  useGLTF,
  Plane,
  OrbitControls,
} from '@react-three/drei';
import gsap from 'gsap';

const SCALE = 10;

export default function App() {
  return (
    <Canvas
      shadows
      style={{ height: '100vh', width: '100vw' }}
      camera={{ fov: 60 }}
    >
      <Scene />
    </Canvas>
  );
}

function Scene() {
  const meshRef = useRef();
  const cameraControlsRef = useRef();

  const { camera } = useThree();

  const [apiData, setApiData] = useState(null);
  const [seatMapData, setSeatMapData] = useState(null);
  const [screenDimensions, setScreenDimensions] = useState(null);

  useEffect(() => {
    fetch(
      'https://spdp.londontheatredirect.com/GetSeatingPlanScheme.ashx?locale=en-GB&performanceId=658847'
    )
      .then((res) => res.json())
      .then((data) => setApiData(data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (!apiData || !camera) return;
    const categoryMap = createSeatMap(apiData.Seats);
    setSeatMapData(categoryMap);
  }, [apiData]);

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 3000;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, 100, 400);
    camera.updateProjectionMatrix();
  }, []);

  useFrame(() => {
    camera.lookAt(
      -apiData.Shapes[0].Y,
      apiData.Shapes[0].Height / 2,
      -apiData.Shapes[0].X
    );
  });

  return (
    <>
      <group rotation={[0, 0, 0]} positionY={-0.5}>
        <Ground />
        <Shadows />
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
        {apiData && (
          <Screen
            args={[apiData.Shapes[0].Width, apiData.Shapes[0].Height]}
            x={-apiData.Shapes[0].Y}
            y={apiData.Shapes[0].Height / 2}
            z={-apiData.Shapes[0].X}
            rotation={[0, 0, 0]}
          />
        )}
        {apiData &&
          seatMapData &&
          Object.keys(seatMapData).map((item, index) => {
            return (
              <RenderSection
                key={index}
                plane={[apiData.Width, apiData.Height]}
                seatMapData={seatMapData}
                section={item}
                z={(Object.keys(seatMapData).length - 1 - index) * 50}
                camera={camera}
                setPosition={(x, y, z) => {
                  gsap.to(camera.position, {
                    x: () => -x,
                    y: () => 10,
                    z: () => -y,
                    duration: 1.5,
                  });
                  // camera.position.set(-x, 10, -y);
                }}
              />
            );
          })}
        {/* {apiData && seatMapData && (
          <RenderSection
            plane={[apiData.Width, apiData.Height]}
            seatMapData={seatMapData}
            section={'Stalls'}
            z={0}
            camera={camera}
            setPosition={(x, y, z) => {
              camera.position.set(-x, 10, -y);
            }}
          />
        )} */}
        <OrbitControls />
      </group>
    </>
  );
}

const Screen = (props) => {
  return (
    <Plane
      position={[props.x, props.y, props.z]}
      {...props}
      // rotation={[Math.PI / 2, 0, 0]}
      // args={[props.width, dimensions.Height]}
    >
      <meshBasicMaterial attach='material' color={'white'} />
    </Plane>
  );
};

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

const Shadows = memo(() => (
  <AccumulativeShadows
    temporal
    frames={100}
    color='#9d4b4b'
    colorBlend={0.5}
    alphaTest={0.9}
    scale={20}
  >
    <RandomizedLight amount={8} radius={4} position={[5, 5, -10]} />
  </AccumulativeShadows>
));

function createSeatMap(seats) {
  const seatMap = {};
  seats.forEach((seat) => {
    const section = seat.Iid.split('-')[0];
    const row = seat.Row;

    if (!seatMap[section]) {
      seatMap[section] = {};
    }
    if (!seatMap[section][row]) {
      seatMap[section][row] = [];
    }

    seatMap[section][row].push(seat);
  });

  return seatMap;
}

const Model = ({ color, x, y, z, size = 10, camera, setPosition, parentZ }) => {
  const gltf = useGLTF('/seat.glb');
  const modelScene = useMemo(() => {
    const clone = gltf.scene.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material.color.set(color);
      }
    });
    return clone;
  }, [gltf.scene, color]);

  const handleOnClick = () => {
    console.log('test', camera.position);
    setPosition(x, y, z);
    // camera.lookAt(new THREE.Vector3(0, 562.37, 0));
  };

  return (
    <primitive
      rotation={[0, Math.PI, 0]}
      onClick={handleOnClick}
      color={color}
      object={modelScene}
      position={[x, parentZ + 5, y]}
      scale={size}
    />
  );
};

const RenderRow = ({
  seatMapData,
  section,
  row,
  plane,
  camera,
  zOffset,
  setPosition,
  parentZ,
}) => {
  const seats = seatMapData[section][row];
  return seats.map((seat, index) => {
    return (
      <Model
        camera={camera}
        key={index}
        color='grey'
        rotation={[0, Math.PI, 0]}
        y={plane[1] / 2 - seat.Y}
        x={plane[0] / 2 - seat.X}
        z={parentZ}
        setPosition={setPosition}
        parentZ={parentZ}
      />
    );
  });
};

const RenderSection = ({
  seatMapData,
  section,
  plane,
  z,
  camera,
  setPosition,
}) => {
  const sectionData = seatMapData[section];
  return (
    <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
      {Object.keys(sectionData).map((row, index) => {
        return (
          <RenderRow
            camera={camera}
            key={index}
            seatMapData={seatMapData}
            section={section}
            row={row}
            zOffset={index}
            plane={plane}
            setPosition={setPosition}
            parentZ={z}
          />
        );
      })}
    </group>
  );
};
