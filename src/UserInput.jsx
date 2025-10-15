import React, { useState, useRef, useEffect } from "react";
import "./UserInput.css";
import axios from 'axios';
import { BarLoader } from "react-spinners";
import { evaluateTemplate, numberToWords, processUrl } from "./Utils";
import { toast } from "react-toastify";

const UserInput = ({
    inputType,       // Mandatory
    inputClass = "",
    maxLength = "",
    inputLabel = "",
    inputStyle = "",
    required = false,
    maxFileSize = Math.Infinity, // e.g. For 2MB File - 6*1024*1024 
    validation = {},
    /*
        For Regex Validation: {
            "type": "regex",
            "pattern": "^[a-zA-Z ]+$",
            "message": "Enter a valid value"
        }
        For Not empty:
        {
            "type": "not_empty",
            "message": "Enter a valid value"
        }
    */
    instanceId = "",
    maxValues = Math.Infinity,
    inputKey,
    placeholder = "",
    accept = "image/jpeg, image/jpg, image/png",
    onChange = () => { },
    onOptionsFetched = () => { },
    onOptionDeselect = () => { },  // Only for Multi-select-dorpdown
    apiUrl = "",
    upload_url = "", // mandatory when inputType is live-upload
    dynamicOptions = "",
    /**
     e.g. {
      url: "api/endpoint",
      method: "get",
      headers: {},
      request_params: {},
      request_payload: {},
      response_key: "data",
      keyMapping: {
        value: "id",        // maps to item.id
        label: "name",      // maps to item.name
        sublabel: "description" // maps to item.description
      },
      autocomplete: { 
        enabled: true, 
        minChars: 3, 
        debounce: 500, 
        queryParam: "q" 
      }
    }
     */
    disabled = false,
    multiple = false,
    id = "",
    options = [], // Add options prop for dropdown, radio buttons, and multiple checkboxes
    amountUnit = "INR", // Add amountUnit prop with default value "INR"
    minAmount = 0, // Add minAmount prop with default value 0
    maxAmount = Infinity, // Add maxAmount prop with default value Infinity
    value: propValue = "", // Add propValue to accept value from props
    size = "md", // Single prop for size with default value "md"
    highlightError = false, // New prop to highlight validation issues
    ...rest
}) => {
    const [error, setError] = useState(highlightError); // Initialize error state with highlightError
    const [value, setValue] = useState(
        propValue ||
        (inputType === "checkbox-multiple" || inputType === "multiselect-dropdown"
            ? []
            : "")
    ); // Initialize value with propValue or default
    const [searchTerm, setSearchTerm] = useState("");
    const [dropdownDirection, setDropdownDirection] = useState("down");
    const dropdownRef = useRef(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1); // Track the highlighted option index
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Track dropdown open/close state
    const [dropdownOptions, setDropdownOptions] = useState(
        Array.isArray(options) ? options : []
    ); // Ensure array
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null); // Ref for file input
    const [isDragging, setIsDragging] = useState(false); // State to track drag state


    useEffect(() => {
        setValue(propValue); // Update state when propValue changes
    }, [propValue]);

    useEffect(() => {
        setError(highlightError); // Update error state when highlightError changes
    }, [highlightError]);

    const handleChange = (e, validationFn) => {
        let inputValue = e?.target?.value || ""; // Handle null or undefined event or value
        if (inputType === "pan") {
            inputValue = inputValue.toUpperCase();
        }
        if (validationFn(inputValue)) {
            setError(false);
            setValue(inputValue);
            onChange(inputValue);
        } else {
            setValue(inputValue);
            setError(true);
        }
    };

    const handleKeyDown = (e, filteredOptions) => {
        if (e.key === "ArrowDown") {
            setHighlightedIndex((prevIndex) =>
                prevIndex < filteredOptions.length - 1 ? prevIndex + 1 : 0
            );
            setIsDropdownOpen(true); // Open dropdown on navigation
        } else if (e.key === "ArrowUp") {
            setHighlightedIndex((prevIndex) =>
                prevIndex > 0 ? prevIndex - 1 : filteredOptions.length - 1
            );
            setIsDropdownOpen(true); // Open dropdown on navigation
        } else if (e.key === "Enter") {
            if (isDropdownOpen && highlightedIndex >= 0) {
                const selectedOption = filteredOptions[highlightedIndex];
                if (selectedOption) {
                    if (inputType === "multiselect-dropdown") {
                        const newValue = Array.isArray(value)
                            ? value.includes(selectedOption.value)
                                ? value.filter((val) => val !== selectedOption.value)
                                : [...value, selectedOption.value]
                            : [selectedOption.value];
                        if (newValue.length > maxValues) {
                            toast.error(`Only ${maxValues} can be selected`);
                        } else {
                            setValue(newValue);
                            onChange(newValue);
                        }
                    } else {
                        setValue(selectedOption.value);
                        onChange(selectedOption.value);
                    }
                    setSearchTerm(""); // Clear search term after selection
                    setHighlightedIndex(-1); // Reset highlighted index
                    setIsDropdownOpen(false); // Close dropdown after selection
                }
            } else {
                setIsDropdownOpen(true); // Open dropdown if closed
            }
        } else if (e.key === "Escape") {
            setIsDropdownOpen(false); // Close dropdown on Escape key
        }
    };

    useEffect(() => {

        if (apiUrl && (!options || options.length === 0)) {
            setIsLoading(true);
            let url = processUrl(`${apiUrl}`, instanceId); // Process URL with base URI and ID

            axios.get(url)
                .then((response) => {
                    const fetchedOptions = response.data.msg.map((item) => ({
                        value: item.key, // Adjust based on API response structure
                        label: item.value, // Adjust based on API response structure
                        sublabel: item.value1, // Adjust based on API response structure
                    }));
                    setDropdownOptions(
                        Array.isArray(fetchedOptions) ? fetchedOptions : []
                    ); // Ensure array
                    onOptionsFetched(fetchedOptions, inputKey); // Notify parent of fetched options
                })
                .catch((error) => {
                    console.error("Error fetching dropdown options:", error);
                    setDropdownOptions([]); // Fallback to empty array on error
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
        else if (dynamicOptions?.url && dynamicOptions?.method && (!options || options.length === 0)) {
            setIsLoading(true);
            let url = processUrl(`${dynamicOptions.url}`, instanceId);
            const finalParams = {};
            const finalPayload = {};

            for (const key in dynamicOptions?.request_params || {}) {
                finalParams[key] = evaluateTemplate(dynamicOptions.request_params[key], instanceId);
            }
            for (const key in dynamicOptions?.request_payload || {}) {
                finalPayload[key] = evaluateTemplate(dynamicOptions.request_payload[key], instanceId);
            }

            const method = dynamicOptions.method?.toLowerCase() || "get";
            const config = {
                method: method,
                url: url,
                params: finalParams,
                headers: dynamicOptions?.headers || {},
            };

            // Only add data for non-GET requests
            if (method !== "get" && Object.keys(finalPayload).length > 0) {
                config.data = finalPayload;
            }

            axios(config)
                .then((response) => {
                    let options_key = dynamicOptions.response_key;
                    let res_options = [];
                    if (options_key) {
                        res_options = response.data.msg?.[options_key];
                    } else {
                        if (Array.isArray(response.data.msg)) {
                            res_options = response.data.msg;
                        }
                    }
                    if (res_options?.length > 0) {
                        // const fetchedOptions = res_options.map((item) => ({
                        //     value: item.key,
                        //     label: item.value,
                        //     sublabel: item.value1,
                        // }));
                        const fetchedOptions = mapFetchedOptions(res_options, dynamicOptions.key_mapping)
                        setDropdownOptions(
                            Array.isArray(fetchedOptions) ? fetchedOptions : []
                        );
                        onOptionsFetched(fetchedOptions, inputKey);
                    }
                })
                .catch((error) => {
                    console.error("Error fetching dropdown options:", error);
                    setDropdownOptions([]);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [apiUrl, dynamicOptions]);

    useEffect(() => {
        const handleDropdownDirection = () => {
            if (dropdownRef.current) {
                const rect = dropdownRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                if (spaceBelow < 200 && spaceAbove > spaceBelow) {
                    setDropdownDirection("up");
                } else {
                    setDropdownDirection("down");
                }
            }
        };

        handleDropdownDirection();
        window.addEventListener("resize", handleDropdownDirection);

        return () => {
            window.removeEventListener("resize", handleDropdownDirection);
        };
    }, [searchTerm]);
    // 🔍 Config-based Autocomplete API search (NEW EFFECT)
    useEffect(() => {
        if (
            !dynamicOptions?.autocomplete?.enabled ||
            (inputType !== "dropdown" && inputType !== "multiselect-dropdown") ||
            !(apiUrl || dynamicOptions?.url) ||
            searchTerm.length < (dynamicOptions?.autocomplete?.minChars || 3)
        ) return;

        const controller = new AbortController();
        const delayDebounce = setTimeout(() => {
            setIsLoading(true);
            const url = processUrl(`${(dynamicOptions?.url || apiUrl)}`, instanceId);
            const method = dynamicOptions?.method?.toLowerCase() || "get";
            const queryKey = dynamicOptions?.autocomplete?.queryParam || "q";
            const limit = dynamicOptions?.autocomplete?.limit || 10;
            const headers = dynamicOptions?.headers || {};

            const config = {
                method: method,
                url: url,
                signal: controller.signal,
                headers: headers,
                params: method === "get"
                    ? { [queryKey]: searchTerm, limit: limit }
                    : { limit: limit },
            };

            // Only add data for non-GET requests
            if (method !== "get") {
                config.data = { [queryKey]: searchTerm };
            }

            axios(config)
                .then((response) => {
                    const optionsKey = dynamicOptions?.response_key;
                    const data = optionsKey
                        ? response.data.msg?.[optionsKey]
                        : Array.isArray(response.data.msg)
                            ? response.data.msg
                            : [];

                    const fetchedOptions = data.map((item) => ({
                        value: item.key,
                        label: item.value,
                        sublabel: item.value1,
                    }));

                    setDropdownOptions(fetchedOptions);
                    onOptionsFetched(fetchedOptions, inputKey);
                })
                .catch((error) => {
                    if (axios.isCancel(error)) return; // Fixed: use 'axios' not 'Axios'
                    console.error("Autocomplete error:", error);
                    setDropdownOptions([]);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }, dynamicOptions?.autocomplete?.debounce || 500);

        return () => {
            clearTimeout(delayDebounce);
            controller.abort();
        };
    }, [searchTerm]);
    // Add this helper function inside your component (after state declarations)
    const mapFetchedOptions = (data, keyMapping) => {
        if (!Array.isArray(data) || data.length === 0) return [];

        // Default key mapping
        const defaultMapping = {
            value: "k",
            label: "v",
            sublabel: "v1"
        };

        // Merge with provided mapping
        const mapping = { ...defaultMapping, ...(keyMapping || {}) };

        return data.map((item) => {
            const mappedItem = {};

            // Map each key dynamically
            Object.keys(mapping).forEach((targetKey) => {
                const sourceKey = mapping[targetKey];

                // Support nested keys like "user.name" or "address.city"
                if (sourceKey.includes('.')) {
                    const keys = sourceKey.split('.');
                    let value = item;
                    for (const key of keys) {
                        value = value?.[key];
                        if (value === undefined) break;
                    }
                    mappedItem[targetKey] = value;
                } else {
                    mappedItem[targetKey] = item[sourceKey];
                }
            });

            return mappedItem;
        });
    };

    const getFontSizeClass = () => {
        switch (size) {
            case "sm":
                return "input-sm";
            case "lg":
                return "input-lg";
            default:
                return "input-md"; // Default to "md"
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        let errorMsg = "";

        // Validate files
        for (const file of files) {
            // Check file size
            if (file.size > maxFileSize * 1024 * 1024) {
                errorMsg = `File '${file.name}' exceeds the maximum size of ${maxFileSize}MB`;
                break;
            }

            // Check file type if accept is specified
            if (
                accept &&
                !accept.split(",").some((type) => {
                    // Handle wildcards like "image/*"
                    if (type.endsWith("/*")) {
                        const category = type.split("/")[0];
                        return file.type.startsWith(`${category}/`);
                    }
                    return type.trim() === file.type;
                })
            ) {
                errorMsg = `File '${file.name}' is not an accepted file type`;
                break;
            }
        }

        if (errorMsg) {
            setError(true);
            // You might want to show this error message to the user
            console.error(errorMsg);
            return;
        }

        setError(false);
        setValue(multiple ? files : files[0]);
        setFileNames(files.map((file) => file.name));
        onChange(multiple ? files : files[0]);
    };

    const removeFile = (index) => {
        if (multiple) {
            const newFiles = [...value];
            newFiles.splice(index, 1);
            const newFileNames = [...fileNames];
            newFileNames.splice(index, 1);

            setValue(newFiles.length > 0 ? newFiles : "");
            setFileNames(newFileNames);
            onChange(newFiles.length > 0 ? newFiles : "");
        } else {
            setValue("");
            setFileNames([]);
            onChange("");
        }
    };

    const handleFileUpload = (files) => {
        if (files?.[0]?.size < maxFileSize) {
            setValue(files[0]);
            onChange(files[0]);
            return;
        }
        toast.error("File Size should be max 2MB");
    };

    const renderInput = () => {
        const commonStyle = {
            ...inputStyle,
        };

        switch (inputType) {
            case "name":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && (
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="text"
                            name={inputLabel || ""}
                            key={inputKey || ""}
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""}`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            required={required}
                            maxLength={maxLength}
                            value={value}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                const isValid = /^[a-zA-Z\s]*$/.test(newValue); // only letters and spaces
                                if (isValid || newValue === "") {
                                    handleChange(e, () => {
                                        if (required) {
                                            if (newValue.trim() === "") {
                                                setError("Name is required");
                                                return false;
                                            } else {
                                                setError(""); // Clear any previous error
                                                return true;
                                            }
                                        } else {
                                            setError(""); // Clear any previous error
                                            return true;
                                        }
                                    });
                                } else {
                                    setError("Only alphabets and spaces are allowed");
                                }
                            }}
                            {...rest}
                        />
                        {/* Conditionally render error message */}
                    </div>
                );
            case "email":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="email"
                            name={inputLabel || ""}
                            key={inputKey || ""}
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                }`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            required={required}
                            value={value} // Use state value
                            onChange={(e) =>
                                handleChange(
                                    e,
                                    (value) =>
                                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && validation
                                )
                            }
                            {...rest}
                        />
                    </div>
                );
            case "password":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="password"
                            id={id || ""}
                            name="password"
                            key={inputKey || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                }`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            required={required}
                            value={value} // Use state value
                            onChange={(e) =>
                                handleChange(e, (value) => value.trim() !== "" && validation)
                            }
                            {...rest}
                        />
                    </div>
                );
            case "pincode":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="text"
                            id={id || ""}
                            name="pincode"
                            // key={inputKey || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                }`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            required={required}
                            value={value}
                            onKeyDown={(e) => {
                                if (
                                    (!/^\d$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "Tab" &&
                                        e.key !== "Enter" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight") ||
                                    (e.target.value.length >= 6 &&
                                        e.key !== "Backspace" &&
                                        e.key !== "Tab" &&
                                        e.key !== "Enter" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight")
                                ) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) => {
                                if (e.target.value.length <= 6) {
                                    handleChange(e, (value) => value.length === 6 && validation);
                                }
                            }}
                            {...rest}
                        />
                    </div>
                );
            case "mobile":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="text"
                            id={id || ""}
                            name="mobile"
                            onKeyDown={(e) => {
                                if (
                                    (!/^\d$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "Tab" &&
                                        e.key !== "Enter" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight") ||
                                    (e.target.value.length >= 10 &&
                                        e.key !== "Backspace" &&
                                        e.key !== "Tab" &&
                                        e.key !== "Enter" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight")
                                ) {
                                    e.preventDefault();
                                }
                            }}
                            key={inputKey || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" :
                                ""}`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            required={required}
                            value={value}
                            onChange={(e) => {
                                if (e.target.value.length <= 10) {
                                    handleChange(
                                        e,
                                        (value) =>
                                            value.trim() !== "" && value.length === 10 && validation
                                    );
                                }
                            }}
                            {...rest}
                        />
                    </div>
                );
            case "amount":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <div
                            className="input-container"
                            style={{
                                display: "flex",
                                border: "1px solid #ccc",
                                borderRadius: "5px",
                            }}
                        >
                            <div className="currency-box">{amountUnit}</div>
                            <input
                                type="number"
                                id={id || ""}
                                name="amount"
                                key={inputKey || ""}
                                className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                    }`}
                                style={{
                                    flex: 1,
                                    border: "none",
                                    outline: "none",
                                    fontSize: "16px",
                                    borderTopRightRadius: "5px",
                                    borderBottomRightRadius: "5px",
                                }}
                                placeholder={placeholder || ""}
                                required={required}
                                value={value === "0" ? null : value}
                                onKeyDown={(e) => {
                                    if (
                                        !/^\d$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "Tab" &&
                                        e.key !== "Enter" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight") {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(e) => {
                                    const inputValue = e.target.value;
                                    const amount = parseFloat(inputValue);

                                    if (
                                        inputValue === "" ||
                                        (!isNaN(amount) &&
                                            amount >= minAmount &&
                                            amount <= maxAmount)
                                    ) {
                                        setValue(inputValue); // Allow valid input
                                        setError(false);
                                        onChange(inputValue);
                                    } else {
                                        setValue(inputValue); // Update value even if invalid
                                        setError(true);
                                    }
                                }}
                                {...rest}
                            />
                        </div>
                        {value && <div>{numberToWords(value)}</div>}
                        {error && (
                            <small className="text-danger">
                                Invalid amount. Must be between {minAmount} and {maxAmount}.
                            </small>
                        )}
                    </div>
                );

            case "aadhaar":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && (
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="text"
                            id={id || ""}
                            name="aadhaar"
                            maxLength={4}                          // ← enforce only 4 chars
                            onKeyDown={(e) => {
                                // only allow digits, backspace, tab, enter, arrows
                                if (
                                    (!/^\d$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "Tab" &&
                                        e.key !== "Enter" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight") ||
                                    // max 4 digits
                                    (e.target.value.length >= 4 &&
                                        /^\d$/.test(e.key))
                                ) {
                                    e.preventDefault();
                                }
                            }}
                            key={inputKey || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""}`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            required={required}
                            value={value}
                            onChange={(e) => {
                                handleChange(
                                    e,
                                    (val) => val.trim() !== "" && val.length === 4
                                );
                            }}
                            {...rest}
                        />
                    </div>
                );

            case "pan":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && (
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="text"
                            id={id || ""}
                            name="pan"
                            maxLength={10} // PAN numbers are 10 characters long
                            onKeyDown={(e) => {
                                const currentValue = e.target.value.toUpperCase(); // Work with uppercase for checks
                                const key = e.key.toUpperCase(); // Convert key to uppercase for consistent checks
                                const currentLength = currentValue.length;

                                // Allow navigation, backspace, tab, enter
                                if (
                                    e.key === "Backspace" ||
                                    e.key === "Tab" ||
                                    e.key === "Enter" ||
                                    e.key === "ArrowLeft" ||
                                    e.key === "ArrowRight"
                                ) {
                                    return;
                                }

                                // Prevent typing if already 10 characters
                                if (currentLength >= 10) {
                                    e.preventDefault();
                                    return;
                                }

                                // Logic for first 5 alphabets
                                if (currentLength < 5) {
                                    if (!/^[A-Z]$/.test(key)) {
                                        e.preventDefault();
                                    }
                                }
                                // Logic for next 4 numbers
                                else if (currentLength >= 5 && currentLength < 9) {
                                    if (!/^\d$/.test(key)) {
                                        e.preventDefault();
                                    }
                                }
                                // Logic for last 1 alphabet
                                else if (currentLength === 9) {
                                    if (!/^[A-Z]$/.test(key)) {
                                        e.preventDefault();
                                    }
                                } else {
                                    // Should not happen if maxLength is 10, but as a fallback
                                    e.preventDefault();
                                }
                            }}
                            key={inputKey || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""}`}
                            style={{ ...commonStyle, textTransform: "uppercase" }} // Ensure input displays uppercase
                            placeholder={placeholder || ""}
                            required={required}
                            value={value ? value.toUpperCase() : ""} // Display value in uppercase
                            onChange={(e) => {
                                const inputValue = e.target.value.toUpperCase(); // Convert input to uppercase immediately
                                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/; // Your validation regex

                                // Update the state with the uppercase value
                                handleChange(
                                    e,
                                    (val) => panRegex.test(val) // Validate against the regex
                                );
                            }}
                            {...rest}
                        />
                    </div>
                );

            case "radio":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <div className="radio-container">
                            {dropdownOptions.map((option, index) => (
                                <label key={index} className="radio-option">
                                    <input
                                        type="radio"
                                        id={`${id}-${index}` || ""}
                                        name={inputLabel || ""}
                                        value={option.value || ""}
                                        checked={value === option.value}
                                        onChange={(e) =>
                                            handleChange(e, (value) => value !== "" && validation)
                                        }
                                        style={{ cursor: "pointer" }}
                                        {...rest}
                                    />
                                    <div className="radio-details">
                                        <span className="radio-label">{option.label || ""}</span>
                                        {option.sublabel && (
                                            <span className="radio-sublabel">
                                                {option.sublabel || ""}
                                            </span>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case "dropdown":
                const filteredDropdownOptions = (
                    Array.isArray(dropdownOptions) ? dropdownOptions : []
                ).filter((option) =>
                    // If searchTerm is empty (e.g., after focusing with a selected item), show all options.
                    // Otherwise, filter by the current searchTerm.
                    option.label?.toLowerCase().includes(searchTerm.toLowerCase())
                );

                return (
                    <div
                        className={`input-container ${getFontSizeClass()}`}
                        style={{ position: "relative" }}
                        tabIndex={`${inputKey}`}// allow div to receive focus/blur
                        onBlur={() => setIsDropdownOpen(false)} // close dropdown on defocus (relies on onMouseDown on items)
                    >
                        {inputLabel && (
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <div style={{ position: "relative" }}>
                            <input
                                type="text"
                                id={id || ""}
                                disabled={disabled}
                                placeholder={placeholder || ""}
                                autoComplete="off"
                                className={`input-field ${inputClass || ""} ${error ? "error" : ""}`}
                                style={commonStyle}
                                value={
                                    // Display searchTerm if user is actively typing,
                                    // otherwise display the label of the selected option,
                                    // or an empty string if nothing is selected/typed.
                                    searchTerm ||
                                    dropdownOptions.find((opt) => opt.value === value)?.label ||
                                    ""
                                }
                                onFocus={() => {

                                    if (value) {
                                        setSearchTerm("");
                                    }
                                    setIsDropdownOpen(true);
                                }}
                                onChange={(e) => {
                                    const inputValue = e?.target?.value || "";
                                    setSearchTerm(inputValue); // Update searchTerm as user types
                                    setIsDropdownOpen(true);    // Keep dropdown open while typing
                                    if (inputValue === "") {    // If user clears the input
                                        setValue("");           // Clear the actual selected value
                                        onChange("");           // Propagate the empty value
                                    }
                                }}
                                onKeyDown={(e) => handleKeyDown(e, filteredDropdownOptions)}
                                ref={dropdownRef}
                            />
                            <span
                                className="dropdown-arrow"
                                style={{
                                    position: "absolute",
                                    right: "10px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                }}
                            >
                                ▼
                            </span>
                        </div>

                        {isDropdownOpen && (
                            <div
                                className={`dropdown-menu show ${dropdownDirection === "up" ? "dropup" : ""}`}
                                style={{
                                    width: "100%",
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    position: "absolute",
                                    zIndex: 1000,
                                    top: dropdownDirection === "up" ? "auto" : "100%",
                                    bottom: dropdownDirection === "up" ? "100%" : "auto",
                                }}
                            >
                                {filteredDropdownOptions.map((option, index) => (
                                    <button
                                        id={option.value || index}
                                        key={option.value || index} // Use option.value for key if unique and available
                                        className={`dropdown-item ${value === option.value ? "selected" : ""} ${highlightedIndex === index ? "highlighted" : ""}`}
                                        onMouseDown={(e) => e.preventDefault()} // Prevents input blur before onClick fires
                                        onClick={() => {
                                            // if (value === option.value) { // If clicking the currently selected item (to deselect)
                                            //   setValue("");
                                            //   setSearchTerm(""); // Clear search term as well
                                            //   onChange("");
                                            // } else { // Selecting a new/different item
                                            setValue(option.value);
                                            setSearchTerm(option.label); // Set input text to the selected option's label
                                            setError(false); // Assuming setError is a prop or state setter
                                            onChange(option.value);
                                            // }
                                            setIsDropdownOpen(false); // Close dropdown after selection
                                        }}
                                    >
                                        {option.label || ""}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case "checkbox":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        <label className="">
                            <input
                                type="checkbox"
                                id={id || ""}
                                name={inputLabel || ""}
                                checked={typeof value === "boolean" ? value : value === "true"} // Ensure value is boolean
                                onChange={(e) => {
                                    setValue(e.target.checked);
                                    onChange(e.target.checked);
                                }}
                                style={{ marginRight: "10px" }}
                                {...rest}
                            />
                            <span dangerouslySetInnerHTML={{ __html: inputLabel }} />{required && "*"}
                        </label>
                    </div>
                );
            case "checkbox-multiple":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <div className="checkbox-container">
                            {dropdownOptions.map((option, index) => (
                                <label key={index} className="checkbox-option">
                                    <input
                                        type="checkbox"
                                        id={`${id}-${index}` || ""}
                                        name={inputLabel || ""}
                                        value={option.value || ""}
                                        checked={
                                            Array.isArray(value) && value.includes(option.value)
                                        } // Ensure value is an array
                                        onChange={(e) => {
                                            const newValue = Array.isArray(value) ? [...value] : [];
                                            if (e.target.checked) {
                                                newValue.push(option.value);
                                            } else {
                                                const index = newValue.indexOf(option.value);
                                                if (index > -1) {
                                                    newValue.splice(index, 1);
                                                }
                                            }
                                            setValue(newValue);
                                            onChange(newValue);
                                        }}
                                        style={{ cursor: "pointer" }}
                                        {...rest}
                                    />
                                    <div className="checkbox-details">
                                        <span className="checkbox-label">{option.label || ""}</span>
                                        {option.sublabel && (
                                            <span className="checkbox-sublabel">
                                                {option.sublabel || ""}
                                            </span>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case "multiselect-dropdown":
                const filteredMultiSelectOptions = !searchTerm ? dropdownOptions : (dropdownOptions || []).filter(
                    (option) =>
                        option.label?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                    <div
                        className={`input-container ${getFontSizeClass()}`}
                        style={{ position: "relative" }}
                    >
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <div
                            className="input-with-clear"
                            style={{
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <input
                                type="text"
                                id={id || ""}
                                placeholder={placeholder || ""}
                                className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                    }`}
                                style={commonStyle}
                                value={searchTerm}
                                autoComplete="off"
                                onFocus={(e) => {
                                    e.preventDefault();
                                    setSearchTerm(""); // Clear search term
                                    setIsDropdownOpen(true); // Show dropdown on focus
                                }}
                                onChange={(e) => setSearchTerm(e?.target?.value || "")}
                                onKeyDown={(e) => handleKeyDown(e, filteredMultiSelectOptions)}
                                ref={dropdownRef}
                                {...rest}
                            />
                            {Array.isArray(value) && value.length > 0 && (
                                <button
                                    type="button"
                                    className="clear-btn"
                                    onClick={() => {
                                        setValue([]);
                                        onChange([]);
                                        onOptionDeselect(value);
                                    }}
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                        {isDropdownOpen && (
                            <div
                                className={`dropdown-menu show ${dropdownDirection === "up" ? "dropup" : ""
                                    }`}
                                style={{
                                    width: "100%",
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    position: "absolute",
                                    zIndex: 1000,
                                    top: dropdownDirection === "up" ? "auto" : "100%",
                                    bottom: dropdownDirection === "up" ? "100%" : "auto",
                                }}
                            >
                                {filteredMultiSelectOptions.map((option, index) => (
                                    <button
                                        key={index}
                                        className={`dropdown-item ${Array.isArray(value) && value.includes(option.value)
                                            ? "selected"
                                            : ""
                                            } ${highlightedIndex === index ? "highlighted" : ""}`}
                                        onClick={() => {
                                            const newValue = Array.isArray(value)
                                                ? value.includes(option.value)
                                                    ? value.filter((val) => val !== option.value)
                                                    : [...value, option.value]
                                                : [option.value];
                                            if (newValue.length > maxValues) {
                                                toast.error(`Only ${maxValues} allowed`);
                                            } else {
                                                setValue(newValue);
                                                setError(false);
                                                setSearchTerm(""); // Clear search term after selection
                                                onChange(newValue);
                                                setIsDropdownOpen(false); // Close dropdown after selection
                                            }

                                        }}
                                    >
                                        {option.label || ""}
                                    </button>
                                ))}
                            </div>
                        )}
                        {Array.isArray(value) && value.length > 0 && (
                            <div className="selected-values">
                                {value.map((val, index) => {
                                    const selectedOption = dropdownOptions.find(
                                        (opt) => opt.value === val
                                    );
                                    return (
                                        <span key={index} className="selected-value">
                                            {selectedOption?.label || ""}
                                            <button
                                                type="button"
                                                className="remove-btn"
                                                onClick={() => {
                                                    const newValue = value.filter((v) => v !== val);
                                                    if (newValue.length < 0) {
                                                        toast.error(`Only ${maxValues} allowed`)
                                                    } else {
                                                        setValue(newValue);
                                                        onOptionDeselect(newValue);
                                                        onChange(newValue);
                                                    }

                                                }}
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            case "datetime":
                // Utility to format API value -> datetime-local compatible
                const formatDateTimeForInput = (val) => {
                    if (!val) return "";
                    const date = new Date(val);
                    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); // adjust for timezone
                    return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
                };

                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && (
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="datetime-local"
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""}`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            value={formatDateTimeForInput(value)} // ✅ formatted for input
                            onChange={(e) => {
                                const isoValue = new Date(e.target.value).toISOString(); // ✅ store back as ISO
                                setValue(isoValue);
                                onChange(isoValue);
                            }}
                            {...rest}
                        />
                    </div>
                );
            case "date":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="date"
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                }`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            value={value} // Use state value
                            onChange={(e) => {
                                setValue(e.target.value);
                                onChange(e.target.value);
                            }}
                            {...rest}
                        />
                    </div>
                );
            case "dob":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && (
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="date"
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""}`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                if (e.target.value.length === 10) {
                                    const selectedDate = new Date(e.target.value);
                                    const today = new Date();
                                    const minDOB = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());
                                    const maxDOB = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

                                    if (selectedDate < minDOB || selectedDate > maxDOB) {
                                        setError(true);
                                        validation.message = `Date should be between 18 and 65 years ago.`;
                                    } else {
                                        setError(false);
                                        onChange(e.target.value);
                                    }
                                }
                            }}
                            min={new Date(
                                new Date().getFullYear() - 65,
                                new Date().getMonth(),
                                new Date().getDate()
                            ).toISOString().split("T")[0]}
                            max={new Date(
                                new Date().getFullYear() - 18,
                                new Date().getMonth(),
                                new Date().getDate()
                            ).toISOString().split("T")[0]}
                            {...rest}
                        />
                        {error && (
                            <small className="text-danger">
                                {validation?.message || "Date must be between 18 and 65 years ago."}
                            </small>
                        )}
                    </div>
                );
            case "button":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        <button
                            type="button"
                            className={`btn btn-secondary btn-sm`}
                            onClick={() => onChange(null)}
                            {...rest}
                        >
                            {inputLabel}
                        </button>
                    </div>
                );
            case "file-upload":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <div
                            className={`file-upload-container ${error ? "error" : ""} ${isDragging ? "dragging" : ""
                                }`}
                            style={{
                                border: "2px dashed #ccc",
                                padding: "20px",
                                textAlign: "center",
                                borderRadius: "5px",
                                cursor: "pointer",
                            }}
                            onDragOver={(e) => {
                                e.preventDefault(); // Prevent default behavior to allow drop
                                e.stopPropagation(); // Stop propagation to avoid conflicts
                                setIsDragging(true); // Set dragging state to true
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault(); // Prevent default behavior
                                e.stopPropagation(); // Stop propagation
                                setIsDragging(false); // Set dragging state to false
                            }}
                            onDrop={(e) => {
                                e.preventDefault(); // Prevent default behavior
                                e.stopPropagation(); // Stop propagation
                                setIsDragging(false); // Reset dragging state
                                const files = Array.from(e.dataTransfer.files);
                                handleFileUpload(files); // Handle the dropped files
                            }}
                            onClick={() => fileInputRef.current.click()} // Trigger file input on click
                        >
                            <input
                                type="file"
                                id={id || ""}
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                multiple={multiple} // Allow multiple file uploads if specified
                                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                                accept={accept} // <-- This line is added
                                {...rest}
                            />
                            <p>
                                {Array.isArray(value) && value.length > 0
                                    ? value.map((file) => file.name).join(", ") // Show file names if multiple files are uploaded
                                    : value?.name ||
                                    "Drag and drop files here, or click to upload"}{" "}
                                {/* Show single file name or placeholder */}
                            </p>
                        </div>
                        {error && (
                            <small className="text-danger">
                                {validation?.message || "Invalid file upload"}
                            </small>
                        )}
                    </div>
                );
            case "live-upload":
                const handleLiveUpload = async (files) => {
                    if (files.every((f) => f.size > maxFileSize)) {
                        toast.error("Max File Size should be 2 MB")
                        validation.message = "Max File Size should be 2 MB";
                        setError(true);
                        return;
                    }
                    const formData = new FormData();
                    files.forEach((file) => {
                        formData.append("file", file); // Append file to FormData
                    });

                    try {
                        const response = await axios.post(`${upload_url}`, formData, {
                            headers: {
                                "Content-Type": "multipart/form-data",
                            },
                        });

                        // Assuming the API response contains document_id, document_path, and file_name
                        const uploadedFileData = response.data; // Adjust based on your API response structure

                        setValue(uploadedFileData); // Update the state with the uploaded file data
                        onChange(uploadedFileData); // Notify parent component of the uploaded file data
                    } catch (error) {
                        console.error("Live upload failed:", error);
                        setError(true); // Set error state
                    }
                };

                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <div
                            className={`file-upload-container ${error ? "error" : ""} ${isDragging ? "dragging" : ""}`}
                            style={{
                                border: "2px dashed #ccc",
                                padding: "20px",
                                textAlign: "center",
                                borderRadius: "5px",
                                cursor: "pointer",
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const files = Array.from(e.dataTransfer.files);
                                handleLiveUpload(files); // Upload files on drop
                            }}
                            onClick={() => fileInputRef.current.click()} // Trigger file input on click
                        >
                            <input
                                type="file"
                                id={id || ""}
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                multiple={false} // Single file upload for live-upload
                                onChange={(e) => handleLiveUpload(Array.from(e.target.files))}
                                accept={accept}
                                {...rest}
                            />
                            <p>
                                {value?.file_name
                                    ? "Click to reupload"
                                    : "Drag and drop files here, or click to upload"}
                            </p>
                        </div>
                        {value?.document_id && (
                            <div className="uploaded-file-details">
                                <a
                                    href={value.document_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-link"
                                >
                                    Click here to view the uploaded File
                                </a>
                            </div>
                        )}
                        {error && (
                            <small className="text-danger">
                                {validation?.message || "Invalid file upload"}
                            </small>
                        )}
                    </div>
                );
            case "hidden":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        <input
                            type="hidden"
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                }`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                onChange(e.target.value);
                            }}
                            {...rest}
                        />
                    </div>
                );
            case "otp":
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && (
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type="tel"
                            name={inputLabel || ""}
                            key={inputKey || ""}
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""
                                }`}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            required={required}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={4}
                            value={value}
                            onChange={(e) => {
                                // only digits, up to 4 chars
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                                handleChange(
                                    { ...e, target: { ...e.target, value: digits } },
                                    () => {
                                        if (required) return digits.length === 4;
                                        return true;
                                    }
                                );
                            }}
                            onPaste={(e) => {
                                // grab only up to 4 digits on paste
                                e.preventDefault();
                                const pasted = e.clipboardData.getData("Text");
                                const digits = pasted.replace(/\D/g, "").slice(0, 4);
                                handleChange(
                                    { ...e, target: { ...e.target, value: digits } },
                                    () => {
                                        if (required) return digits.length === 4;
                                        return true;
                                    }
                                );
                            }}
                            {...rest}
                        />
                        {/* Conditionally render error message */}
                    </div>
                );
            default:
                return (
                    <div className={`input-container ${getFontSizeClass()}`}>
                        {inputLabel && ( // Conditionally render inputLabel
                            <label className="input-label">
                                {inputLabel} {required && "*"}
                            </label>
                        )}
                        <input
                            type={inputType || "text"}
                            id={id || ""}
                            className={`input-field ${inputClass || ""} ${error ? "error" : ""}`}
                            maxLength={maxLength}
                            style={commonStyle}
                            placeholder={placeholder || ""}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                onChange(e.target.value);
                            }}
                            {...rest}
                        />
                    </div>
                );
        }
    };

    return (
        <div
            className="text-start"
            style={{ position: "relative", overflow: "visible" }}
        >
            {isLoading && <BarLoader color="#fff" css={"display:block;"} size={10} />}
            {renderInput()}
            {error && (
                <small className="text-danger">
                    {validation?.message || `Invalid ${inputType}`}
                </small>
            )}
        </div>
    );
};

export default UserInput;
