angular.module('ima-web-client')
    .controller('ReportCtrl', ['$scope', '$location', '$http', '$q', '$filter', '$interval', 'arrayHelper', 'uiGridGroupingConstants', 'uiGridExporterConstants', 'uiGridGridMenuService', 'uiGridExporterService',
    'uiGridConstants', 'url', 'arrayHelper', '$filter', '$timeout', 'uiGridTreeBaseService', 'dataChunker',
  function ($scope, $location, $http, $q, $filter, $interval, $array, uiGridGroupingConstants, uiGridExporterConstants, uiGridGridMenuService, uiGridExporterService, uiGridConstants, $url, $array, $filter, $timeout, uiGridTreeBaseService, dataChunker) {

      $scope.$forms = { saveList: {} };
      var loaderTimeout, toggleTimeout;
      $scope.treeFilter = null;
      $scope.treeFilterHasFocus = false;
      $scope.enableSaveList = false;
      $scope.enableReloadCache = false;
      $scope.initFieldSelected = false;
      $scope.showFoo = false;
      $scope.newFields = true;
      $scope.loading = false;
      $scope.showLoader = false;
      $scope.showFilterLoader = false;
      $scope.value = 0;
      $scope.loaderMax = 1;
      $scope.filterLoaderValue = 0;
      $scope.filterLoaderMax = 5;
      $scope.saveListName = null;
      $scope.totalRows = 1;
      $scope.showProperties = true;
      $scope.customQuestionMap = {};
      $scope.dataFields = [];
      var renderCounter = 0;

      var percentTotal = (function () {
          var _total = 0;

          var aggregator = function (aggregation, fieldValue, numValue, row) {
              if (!aggregation.values) {
                  aggregation.values = [];
                  aggregation.value = 0;
              }
              aggregation.value += numValue;
          };

          var calcTotal = function (aggregation) {
              if (_total) { aggregation.total = _total; return; }

              var rows = aggregation.col.grid.rows,
                  col = aggregation.col,
                  total = 0;

              console.log('full scan');
              angular.forEach(rows, function (row) {
                  total += row.entity[col.field];
              });

              aggregation.total = total;
              _total = total;
          }

          var finalizer = function (aggregation) {

              if (!aggregation.isPercent) {
                  calcTotal(aggregation);
                  aggregation.value = ($filter('number')((aggregation.value / aggregation.total) * 100, 2));
              }

              aggregation.rendered = aggregation.value + '%';
              aggregation.isPercent = true;
          };

          var reset = function () {
              _total = 0;
          }

          return {
              aggregator: aggregator,
              finalizer: finalizer,
              reset: reset
          }
      })();

      $scope.toolbar = [
                 {
                     icon: 'filter',
                     action: function () {
                         if ($scope.gridOptions) {
                             $scope.gridOptions.enableFiltering = !$scope.gridOptions.enableFiltering;
                             $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
                         }

                     },
                     cssClass: function () {
                         if ($scope.gridOptions && $scope.gridOptions.enableFiltering) {
                             return "toggle-down";
                         }
                     },
                     tooltip: 'Toggle filter bar'
                 },
                 {
                     icon: 'download',
                     action: function () {
                         $scope.exportCsv();
                     },
                     show: function () {
                         return $scope.enableDownloadCsv;
                     },
                     tooltip: 'Download data'
                 },
                 {
                     icon: 'save',
                     action: function () {
                         $("#saveToListDialog").modal();

                     },
                     show: function () {
                         return $scope.enableSaveList;
                     },
                     tooltip: 'Save as list'
                 },
                 {
                     icon: 'refresh',
                     action: function () {
                         dataChunker.refreshCache();
                         console.log("GRID OBJ: ", $scope.gridApi.grid);
                         $scope.refreshGrid();
                     },
                     show: function () {
                         return $scope.enableReloadCache;
                     },
                     tooltip: 'Refresh Cache'
                 }
      ];
      //TODO: Hide the special cell in the footer column that has double of element loader
      $scope.gridOptions = {
          enableFiltering: false, //was false
          flatEntityAccess: true,
          fastWatch: true,
          showColumnFooter: true,
          footerTemplate: '/app/templates/widgets/bi-grid/grid-footer-template.html',
          enableGridMenu: true,
          exporterMenuPdf: false,
          enableGroupHeaderSelection: true,
          treeRowHeaderAlwaysVisible: false,
          enableColumnResizing: true,
          enableHorizontalScrollbar: true,
          columnDefs: [{ name: ' ' }], //initial empty dataset
          expandableRowTemplate: '<div ui-grid="row.entity.subGridOptions" style="height:150px;"></div>',
          expandableRowHeight: 150,
          useExternalFiltering: true,
          exporterFieldCallback: function (grid, row, col, value) {
              if (col.cellFilter && col.cellFilter === 'defaultDatetime') {
                  value = $filter('defaultDatetime')(value);
              }
              ////SubGridOptions Pivot
              //if (row.entity.hasOwnProperty('subGridOptions')) {
              //    //console.log("Pivot SubGridOptions", row.entity);
              //    //FOREACH
              //      //ADD columnDef to colDefs
              //      //ADD fieldDef to row
              //}
              ////Custom Pivot
              //if (col.displayName === 'CustomQuestions') {
                 
              //    var cqList = value, //JSON.parse()
              //        entityArray = [],
              //        colArray = [],
              //        index = 0;

              //    for (var i in col.columnDefs) {
              //        colArray.push(col.columnDefs[i]);
              //    }
              //    for (var i in row.entity) {
              //        entityArray.push(row.entity[i]);
              //    }
              //    console.log("ColumnDefs: ", col.columnDefs, colArray);
              //    console.log("JSON Entity: ", row.entity);
              //    console.log("Serailized Entity: ", entityArray);

              //    angular.forEach(cqList, function (cq) {
              //        index++;
              //        var question = cq.QuestionText,
              //            answer = cq.EventQuestAnswerValue,
              //            tempColDef = { 'displayName': 'question ' + index, 'field': 'question-' + index }; //NEW colDef
              //        //col.columnDefs.push(tempColDef);
              //        //ADD (k,v) pair to entity
              //        var tempPair = [];
              //        tempPair[tempColDef.field] = answer;//SERAILIZE tempPair into JSON
              //        entityArray.push(tempPair);
              //        console.log("Adding question to grid", tempPair);

              //        //
                      
              //        row.entity[tempColDef.field] = answer;
              //    });
              //    console.log("CQ Entity: ", entityArray);
              //    //SERAILIZE entityArray into JSON
              //    //SET entity to entityArray
              //    console.log("-------- row.entity: ", row.entity, "-------");
              //}
              return value;
          },
          treeCustomAggregations: {
              percentTotal: { menuTitle: 'Agg: % of Total', aggregationFn: percentTotal.aggregator, finalizerFn: percentTotal.finalizer }
          },
          gridMenuCustomItems: [
          {
              title: 'Select Report Fields',
              action: function ($event) {
                  $scope.toggleProperties();
              },
              order: 9999
          }
          ],
          onRegisterApi: function (gridApi) {
              $scope.gridApi = gridApi;
              $timeout(function () {

                  $scope.gridApi.grid.columns[1].colDef.visible = false;

                  $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
                  $scope.gridApi.grid.refresh();

              }, 100);
              $scope.gridApi.grouping.on.aggregationChanged($scope, function (col) {
                  if (col.treeAggregation.type === 'percentTotal') {

                  }
              });

              $scope.gridApi.core.on.filterChanged($scope, function () {
                  var filters = getFilters();

                  var fields = angular.copy($scope.selectedFields);

                  for (var f in fields) {
                      fields[f] = fields[f].name;
                  }

                  if (angular.isDefined($scope.filterTimeout)) {
                      $timeout.cancel($scope.filterTimeout);
                  }
                  $scope.filterTimeout = $timeout(function () {
                      filterData(fields, filters);
                  }, 500);


              });

              //$scope.gridApi.core.on.rowsRendered($scope, function (args) {
              //    //$timeout.cancel(loaderTimeout);
              //    ////$scope.$broadcast('toggle-loader', { showLoader: false });
              //    //loaderTimeout = $timeout(function () {

              //    //    $scope.toggleLoader('', { showLoader: false });
              //    //}, 5000);
              //    console.log('rows rendered @ ' + new Date().getTime());
              //});

          }
      };

      $scope.exportCsv = function () {

          var grid = $scope.gridApi.grid;
          var rowTypes = uiGridExporterConstants.ALL;
          var colTypes = uiGridExporterConstants.ALL;

          var exportService = uiGridExporterService;

          exportService.loadAllDataIfNeeded(grid, uiGridExporterConstants.ALL, uiGridExporterConstants.VISIBLE).then(function () {
              var exportColumnHeaders = exportService.getColumnHeaders(grid, uiGridExporterConstants.VISIBLE);

              var exportData = exportService.getData(grid, uiGridExporterConstants.ALL, uiGridExporterConstants.VISIBLE);
              //var exportData = getData(grid, uiGridExporterConstants.ALL, uiGridExporterConstants.VISIBLE);
              console.log("exportData: ", exportData, exportColumnHeaders);

              var data = [];
              //ROWS
              //TODO: take the row that has the most custom questions and place prepend it to the data array as [0]
              if (data[0].hasOwnProperty('Registration.CustomQuestions')) {
                  var maxQuestions = 0;
                  for (var row in exportData) {
                      var extractedRow = exportData[row];
                      var cqList = extractedRow["Registration.CustomQuestions"];
                      var numQuestions = cqList.length;
                      if (numQuestions > maxQuestions) {
                          maxQuestions = numQuestions;
                      }

                      for (var cq in cqList) {
                          var answer = cqList[cq].EventQuestAnswerValue;
                          extractedRow.push(answer);
                      }

                      data.push(extractedRow);
                  }
              }
              console.log("Data: ", data);
                //Iterate over each Row
                    //IF: has custom questions column
                        //getQuestionList
                        //Return value of cell as .....?
                        //FOREACH: q in cqList
                            //Add q.EventQuestAnswerValue to row
                            //Add column to columnHeaders

              var csvContent = exportService.formatAsCsv(exportColumnHeaders, exportData, grid.options.exporterCsvColumnSeparator);
              console.log("CSV ", csvContent);
              var fileName = Date() + ".csv";
              exportService.downloadFile(fileName, csvContent, grid.options.exporterOlderExcelCompatibility);
          });

          //uiGridExporterService.csvExport(grid, rowTypes, colTypes);

      };

      $scope.nodeIsVisible = function (node) {
          if (!this.treeFilter || this.treeFilter.length < 2) { return true; }

          if (node.fields && node.fields.length > 0) { node.__expanded = true; }

          if (!(node.DisplayName || node.Name)) { return false; }

          return (node.DisplayName || node.Name).toLowerCase().indexOf(this.treeFilter.toLowerCase()) > -1;
      }

      $scope.toggleTreeFilterFocus = function () {
          $scope.treeFilterHasFocus = !$scope.treeFilterHasFocus;
      }

      $scope.checkError = function (form) {

          return form['listName'].$error.required && form.$submitted;

      }

      $scope.saveList = function (e, forms) {

          if (!forms.saveList.$valid) {
              forms.saveList.$submitted = true;
              e.stopPropagation();
              return;
          }

          var grid = $scope.gridApi.grid;
          var url = $url.api('/Marketing/List/');
          var filteredRows = grid.rows;
          console.log("Filtered Rows: ", filteredRows, grid.rows);
          var data = { name: forms.saveList['listName'].$modelValue, list: [] };

          for (var row in filteredRows) {  
              if (filteredRows[row]["Registration.CustomQuestions"] !== undefined) {
                  if (filteredRows[row]["Registration.CustomQuestions"].length > 0) {
                      filteredRows[row].subGridOptions = {
                          columnDefs: [{ name: "Question", field: "QuestionText" }, { name: "Answer", field: "EventQuestAnswerValue" }],
                          data: filteredRows[row]["Registration.CustomQuestions"]
                      }
                      for (var j = 0; j < filteredRows[row]["Registration.CustomQuestions"].length; j++) {
                          if (!map.hasOwnProperty(filteredRows[row]["Registration.CustomQuestions"][j].QuestionText)) {
                              text = filteredRows[row]["Registration.CustomQuestions"][j].QuestionText;
                              node = customQuestionMap[text];
                              map[text] = { question: text, checked: node ? node.checked : false, filter: node ? node.filter : null };
                          }
                      }
                  }
              }
              //Copy over data
              var tempRow = angular.copy(filteredRows[row].entity);
              var filteredRow = {};
              //remove the period from the cell
              for(var k in tempRow) {            
                  var key = k.replace(/\./g, ' ');        
                  filteredRow[key] = tempRow[k]
              }
              console.log("Adding a row of data:", tempRow, filteredRow);
              data.list.push(filteredRow);
          }
          
          $http.post(url, data).then(
            function successCallback(response) {

            },
            function errorCallback(response) {
              console.log("Error");
            }
          );
      }

      $scope.toggleProperties = function () {
          $scope.showProperties = !$scope.showProperties;
          window.setTimeout(function () {
              $scope.gridApi.core.handleWindowResize();
          }, 100);
      }

      var getFilters = function () {
          var grid = $scope.gridApi.grid, column = null, filter = null, filters = {};
          for (var i = 0, l = grid.columns.length; i < l; i++) {
              column = grid.columns[i];
              if (column.filters.length > 0) {
                  for (var j = 0, k = column.filters.length; j < k; j++) {
                      filter = column.filters[j].term;

                      if (filter != undefined && filter != '') {
                          filters[column.field] = filter;
                      }
                  }
              }
          }
          return filters;
      }

      var onQuestionSelected = function (scope) {
          var selected = [], node;

          for (var m in $scope.customQuestionMap) {
              node = $scope.customQuestionMap[m];
              if (node && node.checked) {
                  selected.push(node);
              }
          }

          scope.colFilter.term = JSON.stringify(selected);
          scope.$apply();
      };



      $scope.onShowCustomQuestionFilter = function (scope) {
          $scope.$emit('bubble-ui-grid-scroll-events', { on: true });
      }

      $scope.onHideCustomQuestionFilter = function (scope) {
          $scope.$emit('bubble-ui-grid-scroll-events', { off: true });
          onQuestionSelected(scope);
      }

      function filterData(fields, filters) {

          var filterCanceller = $q.defer();
          $scope.filterActive = true;
          $scope.showFilterLoader = true;
          $scope.filterLoaderValue = 0;

          if (angular.equals(filters, {})) {
              $scope.changeDatasource();
              $scope.showFilterLoader = false;
              return;
          }

          var data = {
              fields: fields,
              filters: filters
          }

          var request = $http({
              method: 'POST',
              url: $url.api('/Report/Data/Filter/'),
              data: data,
              config: {
                  timeout: filterCanceller.promise
              }
          })

          var promise = request.then(function successCallback(response) {
              var data = JSON.parse(JSON.parse(response.data));
              console.log("get Data with Filter", data[0]);
              if (data[0] !== undefined && (data[0].hasOwnProperty('CustomQuestions') || data[0].hasOwnProperty('Registration.CustomQuestions'))) {
                  console.log("in promise, CustomQuestion Check: ", data[0]);
                  data = mapQuestions(data);
              } else if (data.length > 0) {
                  $scope.saveTotalRows('', { rowCount: data.length });
              } else {
                  console.log("What is in the data object: ", data);
              }
              $scope.gridOptions.data = data;
          }, function errorCallback(response) {

              console.log(response);

          });

          filterCanceller.resolve();
      }

      $scope.updateDatasource = function (datasource) {

          $http({
              method: 'GET',
              url: $url.api('/Report/Meta/Fields/')
          }).then(function successCallback(response) {

              var data = JSON.parse(JSON.parse(response.data));
              $scope.dataFields = data;
              $scope.filterActive = false;
              $scope.selectedFields = {};
              $scope.selectedColumns = {};
              $scope.selectedConstants = {};
              $scope.newFields = false;

          }, function errorCallback(response) {

          });
      }

      $scope.changeDatasource = function () {
          $scope.showLoader = true;
          var fields = angular.copy($scope.selectedFields);
          var colCopy = $scope.selectedFields;
          $scope.gridOptions.data = [];
          $scope.initFieldSelected = false;
          for (var f in fields) {
              fields[f] = fields[f].name;
          }
          $scope.value = 0;
          $scope.loading = true;
          $scope.newFields = false;
          dataChunker.init(colCopy, fields, $scope.gridOptions, getFilters());
      }

      $scope.refreshGrid = function () {
          
          $scope.gridApi.grid.refresh();
          $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
      };

      $scope.showSaveList = function (e, args) {
          console.log("Show Save List",args);
          $scope.enableSaveList = args.isVisible;
      }

      $scope.showDownloadCsv = function (e, args) {
          console.log("Show Download CSV", args);
          $scope.enableDownloadCsv = args.isVisible;
      }

      $scope.showRefreshCache = function (e, args) {
          $scope.enableReloadCache = args.isVisible;
      }

      $scope.toggleLoader = function (e, args) {
          console.log("Toggle Loader @ " + new Date().getTime(), args);
          $scope.loading = false;
          $scope.value = args.value;
          $scope.loaderMax = args.total;
          $timeout.cancel(toggleTimeout);
          toggleTimeout = undefined;

          if (args.showLoader) { 
              $scope.showLoader = true;
          } else if (args.value >= args.total && !args.showLoader) {
              toggleTimeout = $timeout(function () { $scope.showLoader = false; }, 1000);
                // $scope.fieldSelected = true;
          } else {
                // $scope.fieldSelected = false;
          }
      }

      //Select a field from the right menu to load into the report builder
      $scope.addFieldFromDataSource = function (field) {
          var parent = field.Parent ? field.Parent + '.' : '',
              name = parent + field.Name;

          $scope.newFields = true;
          
          var parentColumns = ["Event", "Period", "Registration", "Merchandise", "Person", "Discount", "Donation", "Transaction", "Association Sale"];
          if (field.selected && !$scope.selectedFields.hasOwnProperty(name)) {

              console.log("is Parent field: ", parentColumns.indexOf(field.Name) === -1, "Field Name: " + field.Name, "isArray: " + Array.isArray(field.Fields), $scope.selectedFields, "Type: " + field.Fields);
              if (Array.isArray(field.Fields) === false) {
                  $scope.selectedFields[name] = {
                      name: name,
                      type: field.Fields,
                      fullName: name
                  }
              }

          } else if (!field.selected) {

              delete $scope.selectedFields[name];

          }

          //When parent is checked, all subfields are checked
          if (parent == "" && field.selected) {
              angular.forEach(field.Fields, function (value, key) {
                  if (value.Parent !== null) {
                      var fieldParent = value.Parent ? value.Parent + '.' : '',
                      fieldName = fieldParent + value.Name;
                      field.Fields[key].selected = true;
                      $scope.selectedFields[fieldName] = {
                          name: fieldName,
                          type: value.Fields,
                          fullName: fieldName
                      }
                  }
              });
          }
          else if (parent == "" && !field.selected) {
              angular.forEach(field.Fields, function (value, key) {
                  if (value.Parent !== null) {
                      var fieldParent = value.Parent ? value.Parent + '.' : '',
                      fieldName = fieldParent + value.Name;
                      field.Fields[key].selected = false;
                      delete $scope.selectedFields[fieldName];

                  }
              });
          }

          var objSize = Object.keys($scope.selectedFields).length;
          console.log("Field to remove: ", field.selected, $scope.selectedFields, objSize);
          if (!(objSize > 0)) {
              $scope.fieldSelected = false;
          } else {
              $scope.fieldSelected = true;
          }
      }

      $scope.updateDatasource();

      $scope.isObject = function (input) {

          return typeof input === 'object'
      }

      $scope.isArray = function (input) {

          return $scope.isObject(input) && Object.prototype.toString.call(input) === '[object Array]';
      }

      $scope.$on('refresh-grid', $scope.refreshGrid);

      $scope.$on('show-save-report-list', $scope.showSaveList);

      $scope.$on('show-download-report-csv', $scope.showDownloadCsv);

      $scope.$on('show-refresh-cache-btn', $scope.showRefreshCache);

      $scope.$on('toggle-loader', $scope.toggleLoader);

  }]);