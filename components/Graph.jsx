import { StyleSheet, Text, View } from "react-native";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
  VictoryVoronoiContainer,
} from "victory-native";
import Stat from "./Stat";
import { useState, useEffect } from "react";

export default function Graph(props) {
  function getMax(arr, prop) {
    let max = null;
    for (var i = 0; i < arr.length; i++) {
      if (max == null || parseFloat(arr[i][prop]) > parseFloat(max))
        max = parseFloat(arr[i][prop]);
    }
    return max;
  }

  useEffect(() => {
    setMax(getMax(props.data, "_value").toFixed(2));
    setCurrent(
      parseFloat(props.data[props.data.length - 1]["_value"]).toFixed(2)
    );
  });

  const [max, setMax] = useState(null);
  const [current, setCurrent] = useState(null);

  return (
    <View style={styles.graph}>
      <Text style={styles.graphName}>{props.title}</Text>
      <VictoryChart
        backgroundColor="#111216"
        width={props.width}
        theme={VictoryTheme.material}
        style={{
          parent: {
            marginTop: -20,
          },
        }}
        containerComponent={
          // <VictoryZoomContainer allowZoom={false} allowPan={false} />
          <VictoryVoronoiContainer
            labels={({ datum }) => `${datum._value}`}
            voronoiPadding={35}
          />
        }
      >
        <VictoryAxis
          tickCount={4}
          tickFormat={(y) =>
            new Date(y).toLocaleTimeString("en-US", { hour12: false })
          }
          style={{
            grid: { stroke: "#555555", strokeDasharray: [] },
            axis: { stroke: "transparent" },
            ticks: { stroke: "#555555" },
            tickLabels: { fill: "#aaaaaa" },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickCount={4}
          style={{
            grid: { stroke: "#555555", strokeDasharray: [] },
            axis: { stroke: "transparent" },
            ticks: { stroke: "#555555" },
            tickLabels: { fill: "#aaaaaa" },
          }}
        />
        <VictoryLine
          style={{
            data: { stroke: "#73BF69" },
            parent: { border: "1px solid #ccc" },
          }}
          data={props.data}
          x="_time"
          y="_value"
        />
      </VictoryChart>
      <View style={styles.stats_container_border} />
      <View style={styles.stats_container}>
        <View
          id="stats-current"
          style={{
            ...styles.stats_card,
            height: "100%",
            width: 90,
            justifyContent: "flex-start",
          }}
        >
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text style={{ ...styles.stats_text }}>Current</Text>
            <Stat
              value={
                isFinite(current) && current / max <= 1 ? current / max : 0
              }
              max={false}
            />
            <Text
              style={{ ...styles.circle_text }}
              adjustsFontSizeToFit
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {current != null ? current : "N/A"}
            </Text>
          </View>
        </View>
        <View
          id="stats-max"
          style={{
            ...styles.stats_card,
            height: "100%",
            width: 90,
            justifyContent: "flex-start",
          }}
        >
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text style={{ ...styles.stats_text }}>Max</Text>
            <Stat value={isFinite(max) ? 1 : 0} max={true} />
            <Text
              style={{ ...styles.circle_text, alignSelf: "center" }}
              adjustsFontSizeToFit
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {max != null ? max : "N/A"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  graphName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
    color: "white",
  },
  graph: {
    height: 505,
    alignSelf: "center",
    backgroundColor: "#1d2125",
    borderColor: "#ccccdc12",
    borderWidth: "1px",
    borderStyle: "solid",
  },
  stats_container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginTop: -8,
    paddingTop: 5,
    paddingBottom: 15,
  },
  stats_container_border: {
    alignSelf: "center",
    borderTopWidth: 2,
    borderTopColor: "#555555",
    width: "75%",
  },
  stats_card: {
    marginTop: 10,
    marginBottom: -7,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    width: "100%",
    rowGap: 5,
  },
  circle_text: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 25,
    width: "70%",
  },
  stats_text: {
    color: "#CCCCDC",
    fontWeight: "bold",
    fontSize: 18,
  },
});
