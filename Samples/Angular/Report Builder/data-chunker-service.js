
$ima.factory('dataChunker', ['$rootScope', '$http', '$timeout', '$filter', 'arrayHelper', 'url', 'uiGridConstants',
    function ($rootScope, $http, $timeout, $filter, $array, $url, uiGridConstants) {
        var fields, columns, gridOptions, filters,
            customQuestionMap = {},
            parsedColumns,
            pendingCache,
            readyCache,
            completedCache,
            loading = false, refreshTimeout, retryTimeout,
            rowsLoaded = 0, totalRows = 0, cachePages = 0, refreshAttempts = 0, retryAttempts = 0, 
            firstDefaultRows = 55,
            retryDuration = 1500;

    var init = function (c, f, g, filt) {
        fields = f;        
        columns = c;
        gridOptions = g;
        filters = filt;

        parsedColumns = false;

        rowsLoaded = 0;
        totalRows = 0;
        cachePages = 0;

        pendingCache = [];
        readyCache = [];
        completedCache = [];
        
        refreshAttempts = 0;
        refreshCache();

        $rootScope.$broadcast('show-refresh-cache-btn', { isVisible: true });
        $rootScope.$broadcast('show-download-report-csv', { isVisible: true });
        $rootScope.$broadcast('show-save-report-list', { isVisible: false });
    }

    /**
     * Force the server to load/reload company data into cache (server-side)
     * @remarks: This request does NOT actually return data from the cache. It is used to
     * force the server to reload its cached data for the current logged in user's company.
     * The data must be retreived from the API still.
    **/
    var refreshCache = function () {
        $http({
            method: 'POST',
            url: $url.api('/Report/Data/Cache')
        }).then(function successCallback(response) {
            //RESET
            completedCache = [], readyCache = [], pendingCache = [];
            totalRows = response.data[0]['pageSize'];
            rowsLoaded = 0;
            retryAttempts = 0;
            console.log("Total Rows to expect: " + totalRows);
            getCache();

        }, function errorCallback(response) {
            console.log('error refreshing cache', response);
        });
    };

    /**
     * Check to see if data is already cached for company, force it to load if it's not
    **/
    var getCache = function () {
        $http({
            method: 'GET',
            url: $url.api('/Report/Data/Cache')
        }).then(function successCallback(response) {
            if (response.data === null) {
                refreshCache();
            } else {                    
                getCacheFromSummary(response.data);
            }
        }, function errorCallback(response) {
            console.log('error checking cache', response);
            //Hide Buffer
            $rootScope.$broadcast('error-loader', {});
        });
    };

    /**
     * Retrieve data by page from cach summary
    **/
    var getCacheFromSummary = function (cacheSummary) {
        cachePages = cacheSummary.length;
        console.log("Checking CacheSummary", cacheSummary);
        for (var i = 0; i < cachePages; i++) {

            var currentPage = cacheSummary[i],
                pageNumber = currentPage.page,
                pageRowsLoaded = cacheSummary[i].rows,
                pageRowTotal = (totalRows-firstDefaultRows)/(cachePages-1),
                completedPageIndex = $array.findIndexInArray(completedCache, 'page', pageNumber),
                readyPageIndex = $array.findIndexInArray(readyCache, 'page', pageNumber),
                pendingPageIndex = $array.findIndexInArray(pendingCache, 'page', pageNumber);
            
            if (completedPageIndex !== -1) { //COMPLETED: check pending and ready to make sure they do not contain the completed page

                if (pendingPageIndex !== -1) {
                    pendingCache.splice(pendingCache[pendingPageIndex], 1);
                } else if(readyPageIndex !== -1) {
                    readyCache.splice(readyCache[readyPageIndex], 1);
                }

            } else if(completedPageIndex === -1) { //NOT COMPLETED PAGE: check if page has rows ready to process -> check if pageRowsLoaded match pageRowTotal
                console.log("Page Not Processed ", currentPage);
                if (pendingPageIndex !== -1) { //PENDING: check rows then move to ready
                    if(pageRowsLoaded === 0 && pageRowTotal === 0) {
                        //TODO: move to completed, remove from pending
                        completedCache.push(currentPage);
                        pendingCache.splice(pendingCache[pendingPageIndex], 1);
                    } else if (pageRowsLoaded !== 0) {
                        //TODO: move to ready, remove from pending
                        console.log("Move Page to ReadyCache");
                        rowsLoaded += pageRowsLoaded;
                        readyCache.push(currentPage);
                        pendingCache.splice(pendingCache[pendingPageIndex], 1);
                    } else if(pageRowsLoaded === 0 && pageRowTotal !== 0) {
                        //DO: keep in pending
                        console.log("Keep the page in pending");
                    }
                } else if(pendingPageIndex === -1) { //NOT PENDING: not in completed and not in pending
                    //TODO: add to pending
                    pendingCache.push(currentPage);
                } else {
                    //TODO: error handling
                    console.log("Rows Loaded : expected Rows", rowsLoaded + " : " + pageRowTotal);
                }
            }
        }

        handleCachePages();
    }

    var handleCachePages = function () {

        for (var i = 0; i < readyCache.length; i++) {
            getCachePage(readyCache[i].page, fields);
            completedCache.push(readyCache[i]);
            readyCache.splice(readyCache[i], 1);
        }
        if (pendingCache.length > 0) {
            getPendingCache();
        } else {
            $timeout.cancel(retryTimeout);
            retryTimeout = undefined;
            $rootScope.$broadcast('toggle-loader', { showLoader: false, value: rowsLoaded, total: totalRows });
        }

    }

    var getPendingCache = function () {

        getCache();

        //retryDuration += retryDuration;
        //retryTimeout = $timeout(function () {
        //    getCache();
        //}, retryDuration);

    };

    var getCachePage = function (page, fields) {

        var data = {
            fields: fields,
            filters: filters
        };

        $http({
            method: 'POST',
            url: $url.api('/Report/Data/Cache/' + page + '/'),
            data: data,
        }).then(function successCallback(response) {

            var myRows = JSON.parse(JSON.parse(response.data));
            
            console.log("Rows Loaded: ", rowsLoaded, myRows);
            processCachePage(page, myRows);

        }, function errorCallback(response) {
            console.log(response);
        });
    };

    var processCachePage = function (page, data) {

        var colDefs, diff, index;

        if (!parsedColumns) {
            colDefs = buildConfig(data[0]);
            diff = $array.difference(gridOptions.columnDefs, colDefs, 'field');

            for (var d in diff.deletes) {

                index = $array.findIndexInArray(gridOptions.columnDefs, 'field', diff.deletes[d].field);
      
                if (index > -1) {
                    gridOptions.columnDefs.splice(index, 1);
                }
            }

            for (var a in diff.adds) {

                index = $array.findIndexInArray(gridOptions.columnDefs, 'field', diff.adds[a].field);

                if (index > -1) {
                    //gridOptions.columnDefs.splice(index, 1);
                } else if (gridOptions.columnDefs[0] !== undefined && gridOptions.columnDefs[0].hasOwnProperty('name') && gridOptions.columnDefs[0].name !== " ") {   
                    gridOptions.columnDefs = gridOptions.columnDefs.concat(diff.adds[a]);
                } else if (gridOptions.columnDefs.length === 1 && gridOptions.columnDefs[0].name === " ") {
                    $rootScope.$broadcast('toggle-loader', { showLoader: true, value: rowsLoaded, total: totalRows });
                    gridOptions.columnDefs = colDefs;
                } else if (gridOptions.columnDefs.length === 0 && colDefs.length > 0) {
                    gridOptions.columnDefs = colDefs;
                } else {
                    
                    console.log("In diff Adds catch");
                }
            }

            parsedColumns = true;
        }

        if (fields.hasOwnProperty("Registration.CustomQuestions")) {
            //$rootScope.$broadcast('show-download-report-csv', { 'isVisible': false });
            data = mapQuestions(data);
        }

        gridOptions.data = gridOptions.data.concat(data);
        $rootScope.$broadcast('refresh-grid', {});

    }

    function mapQuestions(data, scope) {
       
        if (data) {
            var map = {}, node = null, text;
            for (var i = 0; i < data.length; i++) {
                if (data[i]["Registration.CustomQuestions"] !== undefined) {
                        data[i].subGridOptions = {
                            columnDefs: [{ name: "Question", field: "QuestionText" }, { name: "Answer", field: "EventQuestAnswerValue" }],
                            data: data[i]["Registration.CustomQuestions"]
                        }
                        for (var j = 0; j < data[i]["Registration.CustomQuestions"].length; j++) {
                            if (!map.hasOwnProperty(data[i]["Registration.CustomQuestions"][j].QuestionText)) {
                                text = data[i]["Registration.CustomQuestions"][j].QuestionText;
                                node = customQuestionMap[text];
                                map[text] = { question: text, checked: node ? node.checked : false, filter: node ? node.filter : null };
                            }
                        }
                }    
            }
            if (map) {
                customQuestionMap = angular.extend(customQuestionMap, map);
            }
            return data;
        }
        return;

    }

    var buildColDef = function (column,isDate) {
        var columnDefs = [],
            fieldDef = null,
            colDef = null;
        var parent = column.split(".")[0],
            display = column.split(".")[1],
            display = parent === display ? parent : display;

        display = parent + " " + display;

        if (isDate) {
            fieldDef = {
                type: 'date',
                name: display
            }
        }
        colDef = {
            field: column,
            displayName: display,
            minWidth: '100',
            width: '*',
            cellEditableCondition: function () { return false; },
            dataType: fieldDef ? fieldDef.type : undefined,
            filter: { condition: uiGridConstants.filter.CONTAINS },
            menuItems: [
                        {
                            title: 'Duplicate Column',
                            action: function (e) {
                                var colDef = buildColDef(this.context.col.field);
                                gridOptions.columnDefs.push(colDef);
                            },
                            icon: 'fa fa-files-o'
                        }],
            customTreeAggregationFinalizerFn: function (aggregation) {
                if (aggregation.rendered) { return; }

                if (typeof (aggregation.groupVal) !== 'undefined') {
                    aggregation.rendered = aggregation.groupVal + ' (' + $filter('number')(aggregation.value) + ')';
                } else {
                    aggregation.rendered = $filter('number')(aggregation.value);
                }

            }
        }

        if (column.toLowerCase().indexOf('date') > -1 || isDate) {
            colDef.type = 'date';
            colDef.cellFilter = 'defaultDatetime';
        }

        if (column === 'CustomQuestions' || column === 'Registration.CustomQuestions' || display === 'CustomQuestions') {
            colDef.cellTemplate = "/app/templates/widgets/bi-grid/custom-question-cell.html";
            colDef.filterHeaderTemplate = '/app/templates/widgets/bi-grid/custom-question-filter.html';
        } 

        if (column.toLowerCase().indexOf('email') !== -1) {
           $rootScope.$broadcast('show-save-report-list', { isVisible: true });
        } 

        colDef.footerCellTemplate = '<div class="ui-grid-cell-contents" >{{col.getAggregationValue() }}</div>';
        
        return colDef;
    };

    var buildConfig = function (row) {
        var columnDefs = [],
            fieldDef = null,
            colDef = null;

        for (var column in row) {
            var validDate = false,
                columnObj = columns[column];
            
            if (columnObj.type == 'DateTime') {
                validDate = true;
            }

            colDef = buildColDef(column, validDate);
            columnDefs.push(colDef);   
        }
        return columnDefs;
    };

        /*
    Copy of getData from grid ui exporter service
    */
    var getData = function (grid, rowTypes, colTypes, applyCellFilters) {
        var data = [];
        var rows;
        var columns, columnsExtension;

        switch (rowTypes) {
            case uiGridExporterConstants.ALL:
                rows = getDataSorted(grid, rowTypes, colTypes, applyCellFilters);
                break;
            case uiGridExporterConstants.VISIBLE:
                rows = grid.getVisibleRows();
                break;
            case uiGridExporterConstants.SELECTED:
                if (grid.api.selection) {
                    rows = grid.api.selection.getSelectedGridRows();
                } else {
                    gridUtil.logError('selection feature must be enabled to allow selected rows to be exported');
                }
                break;
        }

        if (colTypes === uiGridExporterConstants.ALL) {
            columns = grid.columns;
        } else {
            var leftColumns = grid.renderContainers.left ? grid.renderContainers.left.visibleColumnCache.filter(function (column) { return column.visible; }) : [];
            var bodyColumns = grid.renderContainers.body ? grid.renderContainers.body.visibleColumnCache.filter(function (column) { return column.visible; }) : [];
            var rightColumns = grid.renderContainers.right ? grid.renderContainers.right.visibleColumnCache.filter(function (column) { return column.visible; }) : [];

            columns = leftColumns.concat(bodyColumns, rightColumns);
        }

        columnsExtension = columns;


        rows.forEach(function (row, index) {

            if (row.exporterEnableExporting !== false) {

                var extractedRow = [];

                columns.forEach(function (gridCol, index) {
                    // $$hashKey check since when grouping and sorting programmatically this ends up in export. Filtering it out
                    if ((gridCol.visible || colTypes === uiGridExporterConstants.ALL) &&
                         gridCol.colDef.exporterSuppressExport !== true && gridCol.field !== '$$hashKey' &&
                         grid.options.exporterSuppressColumns.indexOf(gridCol.name) === -1) {


                        var cellValue = applyCellFilters ? grid.getCellDisplayValue(row, gridCol) : grid.getCellValue(row, gridCol);
                        var extractedField = { value: grid.options.exporterFieldCallback(grid, row, gridCol, cellValue) };
                        var extension = grid.options.exporterFieldFormatCallback(grid, row, gridCol, cellValue);
                        if (extension) {
                            Object.assign(extractedField, extension);
                        }
                        if (gridCol.colDef.exporterPdfAlign) {
                            extractedField.alignment = gridCol.colDef.exporterPdfAlign;
                        }

                        ////grid.getCellDisplayValue(row, gridCol)
                        //    if (gridCol.colDef.displayName.indexOf("CustomQuestions") !== -1) {
                        //        //pivot json into columns
                        //        var cqList = cellValue;
                        //        for (var iter in cqList) {
                        //            var cqAnswer = cqList[iter].EventQuestAnswerValue;
                        //            //Add a columnDefinition
                        //            var tempColDef = {
                        //                field: 'Question ' + iter,
                        //                displayName: 'Question ' + iter,
                        //                minWidth: '100',
                        //                width: '*',
                        //                cellEditableCondition: function () { return false; },
                        //                dataType: fieldDef ? fieldDef.type : undefined,
                        //                filter: { condition: uiGridConstants.filter.CONTAINS }

                        //            };
                        //            columnsExtracted.push(tempColDef);
                        //            //Add the answer as the cell value
                        //            extractedRow.push(cqAnswer);
                        //        }
                        //    } 
                        if (gridCol.colDef.displayName.indexOf("CustomQuestions") === -1) {
                            extractedRow.push(extractedField);
                        } else {
                            //TODO: remove seperators and replace with ....?
                        }


                    }
                });

                //CHECK IF COLUMNS CONTAINS 'Registration.CustomQuestions'
                columns.forEach(function (gridCol, index) {
                    if (gridCol.colDef.displayName.indexOf("CustomQuestions") !== -1) {
                        var cqList = grid.getCellValue(row, gridCol);
                        //ADD: 
                        for (var iter in cqList) {
                            var cqAnswer = cqList[iter].EventQuestAnswerValue;
                            //Add a columnDefinition
                            var tempColDef = {
                                field: 'Question ' + iter,
                                displayName: 'Question ' + iter,
                                minWidth: '100',
                                width: '*',
                                cellEditableCondition: function () { return false; },
                                dataType: fieldDef ? fieldDef.type : undefined,
                                filter: { condition: uiGridConstants.filter.CONTAINS }

                            };
                            columnsExtracted.push(tempColDef);
                            //Add the answer as the cell value
                            extractedRow.push(cqAnswer);
                        }
                    }
                });

                data.push(extractedRow);
            }
        });

        return data;
    };

    return {
        init: init,
        refreshCache: refreshCache,
        getData: getData
    };


}]);