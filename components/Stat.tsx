import React, { useMemo } from "react";
import { useGauge } from "use-gauge";
import { View, Text, StyleSheet } from "react-native";
import {
  Svg,
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
} from "react-native-svg";

// IMPLEMENTATION TAKEN FROM https://github.com/mattrothenberg/use-gauge

interface StatProps {
  value: number;
  max: boolean;
}

const START_ANGLE = 105;
const END_ANGLE = 255;

export default function Stat(props: StatProps) {
  const { value, max } = props;
  const gauge = useGauge({
    domain: [0, 100],
    startAngle: START_ANGLE,
    endAngle: END_ANGLE,
    numTicks: 21,
    diameter: 160,
  });

  const needle = gauge.getNeedleProps({
    value,
    baseRadius: 12,
    tipRadius: 2,
  });

  const arcStroke = useMemo(() => {
    let color = "";
    if (max === true) color = "green";
    else {
      if (value <= 0.65) {
        color = `green`;
      } else if (value <= 0.85) {
        color = "yellow";
      } else {
        color = "red";
      }
    }

    return `url(#${color}Gradient)`;
  }, [value]);

  return (
    <View style={{ marginTop: -8 }}>
      <Svg {...gauge.getSVGProps()}>
        <Defs>
          <LinearGradient
            id="greenGradient"
            x1="0%"
            x2="100%"
            y1="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#4ade80" />
            <Stop offset="100%" stopColor="#22c55e" />
          </LinearGradient>
          <LinearGradient
            id="yellowGradient"
            x1="0%"
            x2="100%"
            y1="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#fde047" />
            <Stop offset="100%" stopColor="#facc15" />
          </LinearGradient>
          <LinearGradient id="redGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <Stop offset="0%" stopColor="#f87171" />
            <Stop offset="100%" stopColor="#ef4444" />
          </LinearGradient>
        </Defs>
        <G id="arcs">
          <Path
            {...gauge.getArcProps({
              offset: -30,
              startAngle: START_ANGLE,
              endAngle: END_ANGLE,
            })}
            fill="none"
            strokeWidth={15}
            stroke="#aaa"
          />
          <Path
            {...gauge.getArcProps({
              offset: -30,
              startAngle: START_ANGLE,
              endAngle:
                value >= 0 && value <= 1 ? gauge.valueToAngle(value * 100) : 0,
            })}
            strokeWidth={15}
            fill="transparent"
            stroke={arcStroke}
          />
        </G>
        <G id="ticks">
          {gauge.ticks.map((angle) => {
            const asValue = gauge.angleToValue(angle / 100);
            const showText = asValue === 20 || asValue === 80 || asValue === 50;

            return (
              <Line
                key={angle}
                strokeWidth={2}
                {...gauge.getTickProps({ angle, length: showText ? 12 : 6 })}
              />
            );
          })}
        </G>
        <G id="needle">
          <Circle {...needle.base} r={20} />

          <Line
            strokeLinecap="round"
            strokeWidth={4}
            x1={needle.base.cx}
            x2={needle.tip.cx}
            y1={needle.base.cy}
            y2={needle.tip.cy}
          />
        </G>
      </Svg>
    </View>
  );
}
