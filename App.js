import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import "@expo/match-media";
import { useMediaQuery } from "react-responsive";
import "fast-text-encoding";
import { InfluxDB } from "@influxdata/influxdb-client";
import ModalDropdown from "react-native-modal-dropdown";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Graph from "./components/Graph";

// milliseconds per ___
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
// width of tractor
const WIDTH = 3.41;

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
  const [fromDate, setfromDate] = useState(new Date("2023-03-02T18:48:00.0Z"));
  const [toDate, settoDate] = useState(new Date("2023-03-02T18:49:00.0Z"));

  /* 
  Determines which time value changed within the date picker
  this lets us know which state to wait for completion before
  fetching data

  NOTE: We say "wait for completion" because setState functions
        are asynchronous, and we don't want to fetch data before
        that asyncronous operation finishes. If that were to happen,
        we would be grabbing the same data before that state changed.
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
      case "Temp From and To":
        if (whatChanged === value) break;
        setwhatChanged(value);
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
  useEffect(() => {
    settempfromDate(fromDate);
  }, [fromDate]);
  const [temptoDate, settemptoDate] = useState(toDate);
  useEffect(() => {
    settemptoDate(toDate);
  }, [toDate]);
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
  const [wheelBasedVehicleSpeed, setwheelBasedVehicleSpeed] = useState([
    { _field: "empty", _time: "empty", _value: "empty" },
  ]);
  const [torqueData, settorqueData] = useState([
    { _field: "empty", _time: "empty", _value: "empty" },
  ]);
  const [tfcData, settfcData] = useState([
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
  function getWheelBasedVehicleSpeed(data) {
    return data.filter((o) => o._field === "WheelBasedVehicleSpeed");
  }
  function getTFC(data) {
    const groundSpeed = getWheelBasedVehicleSpeed(data);

    return groundSpeed.map((o) => ({
      ...o,
      _field: "tfc",
      _value: (o._value * WIDTH) / 10,
    }));
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

  // show or hide loading indicator when fetching data
  const [showActivityIndicator, setshowActivityIndicator] = useState(false);

  // fetch all data within specified time range
  const fetchData = async () => {
    // if inputted time range != Current Time Range selection
    // clear dropdown selection
    let found = false;
    for (let i = 0; i < timeRangeData.length; i++) {
      if (timeRangeData[i].from == fromDate && timeRangeData[i].to == toDate) {
        found = true;
        break;
      }
    }
    if (!found) resetDropdownSelection();

    // show activity indicator (loading icon)
    setshowActivityIndicator(true);
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
      setwheelBasedVehicleSpeed(getWheelBasedVehicleSpeed(dataArray));
      settfcData(getTFC(dataArray));

      for (i = 0; i < 10 && i < dataArray.length; i++) {
        console.log(dataArray[i]);
      }
      console.log("\n\ntime range queried: " + fromDate + " to " + toDate);
    }

    handlewhatChanged("None");
    // hide activity indicator
    setshowActivityIndicator(false);
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
    handlewhatChanged("Temp From and To");
  };

  // Current time range data to select from saved time ranges
  const [timeRangeData, settimeRangeData] = useState([
    {
      from: new Date("2023-03-02T18:49:0Z"),
      to: new Date("2023-03-02T18:54:0Z"),
    },
    {
      from: new Date("2023-03-02T18:54:0Z"),
      to: new Date("2023-03-02T18:58:0Z"),
    },
    {
      from: new Date("2023-03-02T18:51:0Z"),
      to: new Date("2023-03-02T19:00:0Z"),
    },
  ]);
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

  // current time range component

  const dropdownRef = useRef(null); // Create a ref for the modal dropdown component

  const resetDropdownSelection = () => {
    if (dropdownRef.current) {
      dropdownRef.current.select(-1);
    }
  };

  useEffect(() => {
    console.log("useEffect whatChanged: " + whatChanged);
    if (whatChanged === "None") return;
    else if (whatChanged === "Temp From") {
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
    } else throw new Error("Incorrect 'whatChanged' value: " + whatChanged);
  }, [fromDateChanged, toDateChanged]);

  const isDeviceTablet = useMediaQuery({
    query: "(min-device-width: 600px)",
  });

  // calculate graph width based on device dimensions
  const graphWidth = isDeviceTablet
    ? (Dimensions.get("window").width * 0.94) / 2
    : Dimensions.get("window").width * 0.95;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#101115",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    loadingContainer: {
      position: "absolute",
      top: "50%",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
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
      width: isDeviceTablet ? 150 : 100,
      textAlign: "center",
      borderColor: "#ccccdc12",
      borderWidth: 1,
      borderStyle: "solid",
      borderRadius: 3,
    },
    date_child: {
      color: "#CCCCDC",
      textAlign: "center",
      fontSize: isDeviceTablet ? 18 : 14,
    },

    dropdown: {
      paddingVertical: 4,
      borderWidth: 0,
      borderRadius: 3,
      backgroundColor: "#06908F",
      fontSize: 18,
    },
    dropdown_text: {
      fontSize: 18,
      color: "white",
      width: "100%",
      textAlign: "center",
      textAlignVertical: "center",
      fontWeight: "bold",
    },
    dropdown_text_highlight: {
      color: "white",
      fontWeight: "900",
    },
    refresh_dropdown_list: {
      width: isDeviceTablet ? 150 : 90,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderColor: "#06908F",
      backgroundColor: "#454545",
      borderWidth: 2,
      borderRadius: 3,
      fontSize: 18,
    },
    refresh_dropdown_list_text: {
      textAlign: "center",
      backgroundColor: "#454545",
      color: "white",
    },
    quick_range_dropdown: {
      width: isDeviceTablet ? 310 : 210,
      textAlign: "center",
    },
    quick_range_dropdown_text: {
      width: "100%",
      backgroundColor: "#454545",
      color: "#CCCCDC",
      textAlign: "center",
      borderColor: "#06908F",
      borderWidth: 2,
      borderStyle: "solid",
      borderRadius: 3,
      paddingVertical: isDeviceTablet ? 10 : 6,
      fontSize: isDeviceTablet ? 15 : 12,
      fontWeight: "bold",
    },
    quick_range_dropdown_list: {
      width: isDeviceTablet ? 310 : 210,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderColor: "#06908F",
      backgroundColor: "#454545",
      borderWidth: 2,
      borderRadius: 3,
      fontSize: 18,
    },
    quick_range_dropdown_list_text: {
      textAlign: "center",
      backgroundColor: "#454545",
      color: "white",
    },
    time_range_dropdown_list: {
      marginTop: 10,
      width: "95%",
      backgroundColor: "#454545",
    },
    graphFlexBox: {
      width: "100%",
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 10,
      columnGap: 5,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          animating={showActivityIndicator}
          color="cornflowerblue"
          size="large"
        />
      </View>
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
          <View style={{ width: isDeviceTablet ? 150 : 90 }}>
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontSize: isDeviceTablet ? 16 : 14,
              }}
            >
              Refresh Time
            </Text>
            <ModalDropdown
              animated={false}
              onSelect={(index, value) => {
                setSelectedIndex(index);
                setSelectedValue(value);
              }}
              saveScrollPosition={false}
              defaultValue={selectedValue}
              defaultIndex={selectedIndex}
              options={dropdownData}
              style={{
                ...styles.dropdown,
                paddingVertical: isDeviceTablet ? 10 : 6,
              }}
              showsVerticalScrollIndicator={false}
              textStyle={styles.dropdown_text}
              dropdownStyle={styles.refresh_dropdown_list}
              dropdownTextStyle={styles.refresh_dropdown_list_text}
              dropdownTextHighlightStyle={styles.dropdown_text_highlight}
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
                    fontSize: isDeviceTablet ? 18 : 14,
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
                    fontSize: isDeviceTablet ? 18 : 14,
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
              style={styles.quick_range_dropdown}
              showsVerticalScrollIndicator={false}
              saveScrollPosition={false}
              textStyle={styles.quick_range_dropdown_text}
              dropdownStyle={styles.quick_range_dropdown_list}
              dropdownTextStyle={styles.quick_range_dropdown_list_text}
              dropdownTextHighlightStyle={styles.dropdown_text_highlight}
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
                  paddingVertical: isDeviceTablet ? 10 : 8,
                  fontSize: isDeviceTablet ? 16 : 14,
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
          style={{
            marginTop: 25,
            marginBottom: 5,
          }}
        >
          <Text style={styles.date_child}>Current Time Range</Text>
          <ModalDropdown
            ref={dropdownRef}
            style={{
              backgroundColor: "#1d2125",
              borderColor: "#ccccdc12",
              borderWidth: 1,
              borderColor: "#73BF69",
              borderStyle: "solid",
              borderRadius: 3,
              paddingVertical: 8,
              textAlign: "center",
              textAlignVertical: "center",
            }}
            textStyle={{
              width: "100%",
              textAlign: "center",
              color: "#CCCCDC",
              fontSize: isDeviceTablet ? 18 : 13.5,
            }}
            defaultValue={
              fromDate.toLocaleString("en-US") +
              "  to  " +
              toDate.toLocaleString("en-US")
            }
            options={timeRangeData.map(
              (o) =>
                `${o.from.toLocaleString("en-US")}  to  ${o.to.toLocaleString(
                  "en-US"
                )}`
            )}
            onSelect={(index, value) => {
              settempfromDate(timeRangeData[index].from);
              settemptoDate(timeRangeData[index].to);
              handlewhatChanged("Temp From and To");
              setfromDate(timeRangeData[index].from);
              settoDate(timeRangeData[index].to);
            }}
            animate={false}
            saveScrollPosition={false}
            showsVerticalScrollIndicator={false}
            dropdownStyle={styles.time_range_dropdown_list}
            dropdownTextStyle={{
              fontSize: isDeviceTablet ? 17 : 13,
              textAlign: "center",
              backgroundColor: "#454545",
              color: "white",
            }}
            dropdownTextHighlightStyle={{
              color: "white",
              fontWeight: "800",
              backgroundColor: "#666666",
            }}
          />
        </View>

        <View style={styles.graphFlexBox}>
          <Graph
            title="Tractor Field Capacity"
            data={tfcData}
            width={
              isDeviceTablet
                ? Dimensions.get("window").width * 0.95
                : graphWidth
            }
          />
          <Graph
            title="Fuel Rate (l/h)"
            data={engineFuelRateData}
            width={graphWidth}
          />
          <Graph
            title="Power Consumption (hp)"
            data={hpData}
            width={graphWidth}
          ></Graph>
          <Graph title="Torque (lbf-in)" data={torqueData} width={graphWidth} />
          <Graph
            title="Ground Speed (km/h)"
            data={wheelBasedVehicleSpeed}
            width={graphWidth}
          />
          <Graph
            title="Engine Speed (rpm)"
            data={engineSpeedData}
            width={
              isDeviceTablet
                ? Dimensions.get("window").width * 0.95
                : graphWidth
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
