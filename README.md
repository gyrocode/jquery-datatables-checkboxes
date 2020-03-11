jQuery DataTables Checkboxes
============================

Checkboxes is an extension for the jQuery DataTables library that provides
universal solution for working with checkboxes in a table.

More information and examples are available at
[gyrocode.com/projects/jquery-datatables-checkboxes/](https://www.gyrocode.com/projects/jquery-datatables-checkboxes/).


How to use
----------

````
$('#example').DataTable({
   'columnDefs': [
      {
         'targets': 0,
         'checkboxes': true
      }
   ],
   'order': [[1, 'asc']]
});
````

New features (v. 1.2.11):
-------------------------
If DataTables rowId is provided, it is used by this plugin;

Changed:
````
columns().checkboxes.selected(), column().checkboxes.selected()
````
Retrieves data for selected checkboxes (like the original);
If the column used with this plugin is rowID, will provide ids, if not, will provide cell.data()

Added functionality:
````
columns().checkboxes.ids(), column().checkboxes.ids()
````
Retrieves rowIds for selected checkboxes in columns
````
columns().checkboxes.data(), column().checkboxes.data()
````
Retrieves row.data() for selected checkboxes in columns.
This feature is usefull especially when serverSide is enabled and
selected row data from other pages than the current one is needed.

Turned Off
hardcoded ````colOptions{'searchable': false}```` because it is usefull to search on a column and is
not changing plugins behaviour. ````orderable```` column option is still hardcoded to ````false```` but
only because the ````.dt-checkboxes-select-all```` input is not properly aligned being used with
DataTable column order icon.
Could be used if ````selectAllRender```` option is ````false````, i think....

Renamed local variabiles to reflect more accurate the content of them:
cellsData to pluginIds
cellData to pluginId

Bug Fixes or deprecated functions removed (v. 1.2.11):
------------------------------------------------------
If FixedColumns extension is enabled, (specially when stateSave enabled) and the
column used for selection is not the first one, .dt-checkboxes-select-all cloned checkbox
does not have the correct checked / indeterminate property.

Removed
````
dt.fixedColumns().cellIndex()
````
because is [deprecated](https://datatables.net/reference/api/fixedColumns().cellIndex()) and does not work well with FixedColumns extension


Need more tests:
----------------
If both FixedColumns and FixedHeader extensions are enabled or if serverSide is not used


Documentation
-------------

Documentation is available at
[gyrocode.com/projects/jquery-datatables-checkboxes/](https://www.gyrocode.com/projects/jquery-datatables-checkboxes/).


Copyright
---------

Gyrocode, [gyrocode.com](https://www.gyrocode.com)


License
-------

MIT License, [opensource.org/licenses/MIT](http://www.opensource.org/licenses/MIT)
