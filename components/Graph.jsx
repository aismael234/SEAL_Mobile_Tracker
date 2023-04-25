import { StyleSheet, Text, View } from "react-native";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryZoomContainer,
  VictoryTheme,
  VictoryToolTip,
  VictoryVoronoiContainer,
} from "victory-native";

export default function Graph(props) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  graphName: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
    color: "#CCCCDC",
  },
  graph: {
    alignSelf: "center",
    backgroundColor: "#1d2125",
    borderColor: "#ccccdc12",
    borderWidth: "1px",
    borderStyle: "solid",
  },
});
