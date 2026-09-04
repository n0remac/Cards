fn main() {
    println!("cargo:rerun-if-changed=../../proto/dice/v1/dice.proto");
    prost_build::Config::new()
        .compile_protos(&["../../proto/dice/v1/dice.proto"], &["../.."])
        .expect("compile dice protobuf contract");
}
