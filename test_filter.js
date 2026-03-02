// 测试是否有过滤逻辑
const requestBody = {
    image: "test.jpg",
    scale_factor: "2x",
    optimized_for: "standard",
    creativity: 0,
    hdr: 0,
    resemblance: 0,
    fractality: 0,
    engine: "automatic"
};

console.log("Original:", requestBody);

// 测试常见的过滤模式
const filtered = Object.fromEntries(
    Object.entries(requestBody).filter(([_, v]) => v)
);
console.log("Filtered (truthy only):", filtered);

// 测试是否 0 被认为是 falsy
console.log("Is 0 falsy?", !0);
console.log("Is 0 == false?", 0 == false);
