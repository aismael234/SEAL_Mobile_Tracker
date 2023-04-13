import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Pressable,
} from "react-native";
import "fast-text-encoding";
import { InfluxDB } from "@influxdata/influxdb-client";
import ModalDropdown from "react-native-modal-dropdown";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Graph from "./components/Graph";

// milliseconds per ___
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;

// InfluxDB setup
// **These are private credentials and should not be displayed in production**
const token =
  "4oaBPQIZR46YM6XA_z7cojw_yRTCx353Lj7KweWZLw2Gzl79sp2PQqYc-Y22zCWi8dhzlRBn9epre1bk1WI7BA==";
const org = "d299810bfddf9f13";
const bucket = "seal_project";
const url = "https://us-west-2-2.aws.cloud2.influxdata.com";
const client = new InfluxDB({ url, token });

export default function App() {
  // Quick Range selection
  const quickRangeData = [
    "Last 5 minutes",
    "Last 10 minutes",
    "Last 30 minutes",
    "Last 1 hour",
    "Last 3 hours",
    "Last 6 hours",
    "Last 12 hours",
    "Last 24 hours",
  ];

  // Date picker functionality
  const [isFromDatePickerVisible, setFromDatePickerVisibility] =
    useState(false);
  const [isToDatePickerVisible, setToDatePickerVisibility] = useState(false);

  // True date values. These are used for fetching data.
  const [fromDate, setfromDate] = useState(
    new Date("2023-03-02T18:48:59.495Z")
  );
  const [toDate, settoDate] = useState(new Date("2023-03-02T18:50:48.577Z"));

  /* 
  Determines which time value changed within the date picker
  this lets us know which state to wait for completion before
  fetching data

  NOTE: We say "wait for completion" because setState functions
        are asynchronous
  */
  // initial state set to both changed to allow initial fetchData call
  const [whatChanged, setwhatChanged] = useState("Temp From and To");

  const handlewhatChanged = (value) => {
    console.log("current value: " + whatChanged);
    console.log("incoming value: " + value);
    switch (value) {
      case "None":
        setwhatChanged(value);
        break;
      case "Temp From":
        if (whatChanged === "Temp From and To" || whatChanged === value) break;
        if (whatChanged === "Temp To") setwhatChanged("Temp From and To");
        else setwhatChanged(value);
        break;
      case "Temp To":
        if (whatChanged === "Temp From and To" || whatChanged === value) break;
        if (whatChanged === "Temp From") setwhatChanged("Temp From and To");
        else setwhatChanged(value);
        break;
      default:
        throw new Error("Incorrect 'whatChanged' value: " + whatChanged);
    }
  };

  // Date pickers hold these temp dates until "Apply" is pressed
  /* 
  The reason why we hold these temporary values is because
  the automatic updates feature uses the true date values to fetch data.
  We don't want to select a time range and have it fetch that new date
  before we can hit "Apply", so we hold it onto the temp value. 
  Once we hit "Apply", the true date values are finally set to the current temp values.
  */
  const [tempfromDate, settempfromDate] = useState(fromDate);
  const [temptoDate, settemptoDate] = useState(toDate);

  // Set date picker component visibility
  const showFromDatePicker = () => {
    setFromDatePickerVisibility(true);
  };
  const hideFromDatePicker = () => {
    setFromDatePickerVisibility(false);
  };
  const showToDatePicker = () => {
    setToDatePickerVisibility(true);
  };
  const hideToDatePicker = () => {
    setToDatePickerVisibility(false);
  };

  // set temp dates upon pressing date picker "Confirm" button
  const handlefromDateConfirm = (date) => {
    hideFromDatePicker();
    settempfromDate(date);
    handlewhatChanged("Temp From");
    console.warn("A FROM date has been picked: ", date);
  };
  const handletoDateConfirm = (date) => {
    hideToDatePicker();
    settemptoDate(date);
    handlewhatChanged("Temp To");
    console.warn("A TO date has been picked: ", date);
  };
  /* 
    checks if value in datepicker is Date object or string (e.g. 'now - 5m')
    if string, converts to corresponding date 
  */
  function dateOrString(date) {
    if (typeof date === "string" || date instanceof String) {
      if (date == "now") return new Date();
      else {
        const regex = /\d+/;
        const match = date.match(regex);

        if (match) {
          // find first occurrence of number
          const number = parseInt(match[0]);

          // subtract by either minutes or hours
          if (date.endsWith("m"))
            return new Date(new Date().getTime() - number * MS_PER_MINUTE);
          else if (date.endsWith("h"))
            return new Date(new Date().getTime() - number * MS_PER_HOUR);
        } else {
          // incorrect format
          throw new Error("Date regex failed. String evaluated: " + date);
        }
      }
    } else return date;
  }

  // InfluxDB query result data
  const [data, setData] = useState([
    { _field: "empty", _time: "empty", _value: "empty" },
  ]);

  // Individual graphs data
  const [engineSpeedData, setengineSpeedData] = useState([
    { _field: "empty", _time: "empty", _value: "empty" },
  ]);
  const [actualEnginePercentTorqueData, setactualEnginePercentTorqueData] =
    useState([{ _field: "empty", _time: "empty", _value: "empty" }]);
  const [engineFuelRateData, setengineFuelRateData] = useState([
    { _field: "empty", _time: "empty", _value: "empty" },
  ]);
  const [torqueData, settorqueData] = useState([
    { _field: "empty", _time: "empty", _value: "empty" },
  ]);
  const [hpData, sethpData] = useState([
    { _field: "empty", _time: "empty", _value: "empty" },
  ]);

  // data calculations for graph visualizations
  // NOTE: any graph's calculation call should only come after the data it depends on is acquired/calculated
  function getengineSpeed(data) {
    return data.filter((o) => o._field === "EngineSpeed");
  }
  function getactualEnginePercentTorque(data) {
    return data.filter((o) => o._field === "ActualEnginePercentTorque");
  }
  function getengineFuelRate(data) {
    return data.filter((o) => o._field === "EngineFuelRate");
  }
  function gettorque(data) {
    return data
      .filter((o) => o._field === "ActualEnginePercentTorque")
      .map((o) => ({ ...o, _value: (o._value / 100) * 5252 }));
  }

  function getHP(data) {
    const tempengineSpeedData = getengineSpeed(data);

    const r = getactualEnginePercentTorque(data).map((o) => ({
      ...o,
      _field: "hp",
      _value:
        (o._value / 100) *
        tempengineSpeedData.find((m) => m._time === o._time)._value,
    }));

    return r;
  }

  // fetch all data within specified time range
  const fetchData = async () => {
    const fromDateCopy = dateOrString(fromDate);
    const toDateCopy = dateOrString(toDate);

    // error checking
    if (fromDateCopy.getTime() >= toDateCopy.getTime()) {
      console.log("'From' date must be before 'To' date.");
    } else if (
      Math.abs(toDateCopy.getTime() - fromDateCopy.getTime()) > 86400000
    ) {
      console.log("The time between two dates cannot exceed 1 day.");
    }
    // upon successful parameters
    else {
      const query = `from(bucket:"${bucket}")
    |> range(start: ${fromDateCopy.toISOString()}, stop: ${toDateCopy.toISOString()})
    |> aggregateWindow(every: 1s, fn: mean)
    |> filter(fn: (r) => r["_measurement"] =~ /2DD36A74/)
    |> yield(name: "mean")`;
      let dataArray = [];
      for await (const { values, tableMeta } of client
        .getQueryApi(org)
        .iterateRows(query)) {
        const o = tableMeta.toObject(values);
        dataArray.push(o);
      }
      setData(dataArray);

      // calculate all graph data
      setengineSpeedData(getengineSpeed(dataArray));
      setactualEnginePercentTorqueData(getactualEnginePercentTorque(dataArray));
      setengineFuelRateData(getengineFuelRate(dataArray));
      settorqueData(gettorque(dataArray));
      sethpData(getHP(dataArray));

      for (i = 0; i < 10 && i < dataArray.length; i++) {
        console.log(dataArray[i]);
      }
      console.log("\n\ntime range queried: " + fromDate + " to " + toDate);
    }
    handlewhatChanged("None");
  };

  // Live update interval selection
  const dropdownData = ["OFF", "3s", "5s", "10s"];
  const [selectedValue, setSelectedValue] = useState("OFF");
  const [selectedIndex, setSelectedIndex] = useState(0);

  /* 
    Automatic graph data updates
    using interval timers. Triggers every time
    'selectedValue'(Refresh Timer value) changes.
  */
  useEffect(() => {
    if (selectedValue != "OFF") {
      const regex = /\d+/;
      const match = selectedValue.match(regex);

      if (match) {
        // find first occurrence of number
        const number = parseInt(match[0]);

        // set interval to 'Refresh Time'
        const interval = setInterval(() => {
          fetchData();
        }, number * MS_PER_SECOND);

        return () => clearInterval(interval);
      } else {
        // incorrect format
        throw new Error(
          "Refresh timer regex failed. String evaluated: " + selectedValue
        );
      }
    }
  }, [selectedValue]);

  // Apply a quick range selection to current time
  const handleQuickRange = (index, value) => {
    settemptoDate("now");
    switch (value) {
      case "Last 5 minutes":
        settempfromDate("now-5m");
        break;
      case "Last 10 minutes":
        settempfromDate("now-10m");
        break;
      case "Last 30 minutes":
        settempfromDate("now-30m");
        break;
      case "Last 1 hour":
        settempfromDate("now-1h");
        break;
      case "Last 3 hours":
        settempfromDate("now-3h");
        break;
      case "Last 6 hours":
        settempfromDate("now-6h");
        break;
      case "Last 12 hours":
        settempfromDate("now-12h");
        break;
      case "Last 24 hours":
        settempfromDate("now-24h");
        break;
    }
  };

  /*
    makes sure that the state of all Date objects
    are updated BEFORE calling fetchData() 
  */
  const [fromDateChanged, setfromDateChanged] = useState(false);
  const [toDateChanged, settoDateChanged] = useState(false);

  useEffect(() => {
    setfromDateChanged(true);
  }, [fromDate]);

  useEffect(() => {
    settoDateChanged(true);
  }, [toDate]);

  useEffect(() => {
    console.log("useEffect whatChanged: " + whatChanged);
    if (whatChanged === "Temp From") {
      if (fromDateChanged) {
        // If only from date was changed
        fetchData();
        setfromDateChanged(false);
        settoDateChanged(false);
      }
    } else if (whatChanged === "Temp To") {
      if (toDateChanged) {
        // If only to date was changed
        fetchData();
        setfromDateChanged(false);
        settoDateChanged(false);
      }
    } else if (whatChanged === "Temp From and To") {
      if (fromDateChanged && toDateChanged) {
        // Run specific function after all state updates are completed
        fetchData();
        setfromDateChanged(false);
        settoDateChanged(false);
      }
    } else if (whatChanged === "None") return;
    else throw new Error("Incorrect 'whatChanged' value: " + whatChanged);
  }, [fromDateChanged, toDateChanged]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={false}
        style={{ flex: 1, width: "95%" }}
        contentContainerStyle={styles.scrollview}
        scrollEnabled={true}
        onContentSizeChange={this.onContentSizeChange}
      >
        <Text style={styles.header}>SEAL Tractor Logger</Text>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <View style={{ width: 90 }}>
            <Text style={{ color: "#fff", textAlign: "center" }}>
              Refresh Time
            </Text>
            <ModalDropdown
              animated={false}
              onSelect={(index, value) => {
                setSelectedIndex(index);
                setSelectedValue(value);
              }}
              defaultValue={selectedValue}
              defaultIndex={selectedIndex}
              options={dropdownData}
              style={styles.dropdown}
              showsVerticalScrollIndicator={false}
              textStyle={styles.dropdown_text}
              dropdownStyle={styles.dropdown_dropdown}
            />
          </View>
          <View style={{ display: "flex", flexDirection: "column", rowGap: 8 }}>
            <View
              style={{ display: "flex", flexDirection: "row", columnGap: 10 }}
            >
              <View style={{ display: "flex", flexDirection: "column" }}>
                <Text
                  style={{
                    fontWeight: "bold",
                    color: "#CCCCDC",
                    textAlign: "center",
                    marginBottom: 5,
                  }}
                >
                  From
                </Text>
                <Pressable
                  id="fromDate-pressable"
                  onPress={showFromDatePicker}
                  style={({ pressed }) => [
                    styles.date_pressable,
                    {
                      backgroundColor: pressed ? "#232323" : "#292929",
                    },
                  ]}
                >
                  <Text style={styles.date_child}>
                    {tempfromDate.toLocaleString("en-US")}
                  </Text>
                </Pressable>
                <DateTimePickerModal
                  id="fromDate"
                  isVisible={isFromDatePickerVisible}
                  display="inline"
                  mode="datetime"
                  date={dateOrString(tempfromDate)}
                  onConfirm={handlefromDateConfirm}
                  onCancel={hideFromDatePicker}
                />
              </View>
              <View style={{ display: "flex", flexDirection: "column" }}>
                <Text
                  style={{
                    fontWeight: "bold",
                    color: "#CCCCDC",
                    textAlign: "center",
                    marginBottom: 5,
                  }}
                >
                  To
                </Text>
                <Pressable
                  id="toDate-pressable"
                  onPress={showToDatePicker}
                  style={({ pressed }) => [
                    styles.date_pressable,
                    {
                      backgroundColor: pressed ? "#232323" : "#292929",
                    },
                  ]}
                >
                  <Text style={styles.date_child}>
                    {temptoDate.toLocaleString("en-US")}
                  </Text>
                </Pressable>
                <Pressable />
                <DateTimePickerModal
                  id="toDate"
                  isVisible={isToDatePickerVisible}
                  display="inline"
                  mode="datetime"
                  date={dateOrString(temptoDate)}
                  onConfirm={handletoDateConfirm}
                  onCancel={hideToDatePicker}
                />
              </View>
            </View>
            <ModalDropdown
              id="quick-range-dropdown"
              animated={false}
              onSelect={handleQuickRange}
              defaultValue="Quick Range (e.g. 'last 5 min.')"
              options={quickRangeData}
              style={styles.date_quick_range_dropdown}
              showsVerticalScrollIndicator={false}
              textStyle={styles.date_quick_range_dropdown_text}
              dropdownStyle={styles.dropdown_dropdown}
            />
            <Pressable
              style={({ pressed }) => [
                styles.date_child,
                {
                  backgroundColor: pressed ? "#232323" : "#292929",
                },
              ]}
              onPress={() => {
                setfromDate(tempfromDate);
                settoDate(temptoDate);
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  color: "#CCCCDC",
                  textAlign: "center",
                  paddingVertical: 6,
                  borderColor: "#ccccdc12",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderRadius: 3,
                }}
              >
                Apply Time Range
              </Text>
            </Pressable>
          </View>
        </View>
        <View
          style={[
            styles.date_child,
            {
              marginTop: 25,
              marginBottom: 7,
              backgroundColor: "#1d2125",
              borderColor: "#ccccdc12",
              borderWidth: 1,
              borderStyle: "solid",
              borderRadius: 3,
              paddingVertical: 4,
            },
          ]}
        >
          <Text style={styles.date_child}>Current Time Range:</Text>
          <Text style={styles.date_child}>
            {fromDate.toLocaleString("en-US")} to{" "}
            {toDate.toLocaleString("en-US")}
          </Text>
        </View>
        <View style="graphFlexBox">
          <Graph title="Engine Speed (rpm)" data={engineSpeedData} />
          <Graph title="hp" data={hpData}></Graph>
          <Graph title="Torque (? unit)" data={torqueData} />
          <Graph title="Fuel Rate (l/h?)" data={engineFuelRateData} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101115",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 10,
    textAlign: "center",
    color: "white",
  },
  date_pressable: {
    width: 100,
    textAlign: "center",
    borderColor: "#ccccdc12",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 3,
  },

  date_quick_range_dropdown: {
    width: 210,
    textAlign: "center",
  },
  date_quick_range_dropdown_text: {
    width: 210,
    backgroundColor: "#292929",
    color: "#CCCCDC",
    textAlign: "center",
    borderColor: "#ccccdc12",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 3,
    paddingVertical: 4,
  },
  date_child: {
    color: "#CCCCDC",
    textAlign: "center",
  },

  dropdown: {
    width: "100%",
    paddingVertical: 4,
    borderWidth: 0,
    borderRadius: 3,
    backgroundColor: "cornflowerblue",
  },
  dropdown_text: {
    fontSize: 18,
    color: "white",
    width: "100%",
    textAlign: "center",
    textAlignVertical: "center",
  },
  dropdown_dropdown: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderColor: "cornflowerblue",
    borderWidth: 2,
    borderRadius: 3,
  },
  graphFlexBlox: {
    display: "flex",
    flexDirection: "column",
    rowGap: 10,
  },
});
