import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { Colors } from "../../theme/colors";

export default function DataTable({
  columns = [],
  data = [],
  onRowPress,
  renderCell,
  renderRowActions,
  actionColumnTitle = "Action",
  actionColumnWidth = 240,
}) {
  const getRowKey = (item, rowIndex) => {
    const baseKey =
      item?.uiKey ||
      item?.rawId ||
      item?.id ||
      item?._id ||
      `row-${rowIndex}`;

    return `${baseKey}-${rowIndex}`;
  };

  const renderCellContent = (item, col, rowIndex) => {
    if (typeof renderCell === "function") {
      return renderCell(item, col, rowIndex);
    }

    return item[col.key];
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          {columns.map((col, index) => (
            <Text
              key={index}
              style={[styles.headerCell, { width: col.width || 140 }]}
            >
              {col.title}
            </Text>
          ))}
          {renderRowActions ? (
            <Text style={[styles.headerCell, { width: actionColumnWidth }]}>
              {actionColumnTitle}
            </Text>
          ) : null}
        </View>

        {data.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No data found</Text>
          </View>
        ) : (
          data.map((item, rowIndex) => (
            <View key={getRowKey(item, rowIndex)} style={styles.row}>
              {onRowPress ? (
                <Pressable
                  style={styles.rowMain}
                  onPress={() => onRowPress(item, rowIndex)}
                >
                  {columns.map((col, colIndex) => (
                    <Cell
                      key={colIndex}
                      item={item}
                      col={col}
                      rowIndex={rowIndex}
                      renderCellContent={renderCellContent}
                    />
                  ))}
                </Pressable>
              ) : (
                <View style={styles.rowMain}>
                  {columns.map((col, colIndex) => (
                    <Cell
                      key={colIndex}
                      item={item}
                      col={col}
                      rowIndex={rowIndex}
                      renderCellContent={renderCellContent}
                    />
                  ))}
                </View>
              )}

              {renderRowActions ? (
                <View style={[styles.actionCell, { width: actionColumnWidth }]}>
                  {renderRowActions(item, rowIndex)}
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Cell({ item, col, rowIndex, renderCellContent }) {
  const content = renderCellContent(item, col, rowIndex);

  return (
    <View style={[styles.cell, { width: col.width || 140 }]}>
      {React.isValidElement(content) ? (
        content
      ) : (
        <Text numberOfLines={1} style={styles.cellText}>
          {String(content ?? "")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: 600,
    backgroundColor: "#0E0826",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
  },
  headerCell: {
    paddingVertical: 11,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "900",
    color: "#fff",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,154,255,0.10)",
  },
  rowMain: {
    flexDirection: "row",
    flex: 1,
  },
  cell: {
    paddingVertical: 11,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  cellText: {
    fontSize: 12,
    color: "#F5EAFF",
  },
  actionCell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  emptyBox: {
    padding: 16,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontWeight: "600",
  },
});
